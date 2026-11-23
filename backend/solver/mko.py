import os
os.environ["OMP_NUM_THREADS"] = "16"
os.environ["MKL_NUM_THREADS"] = "16"

import matplotlib
try:
    matplotlib.use('TkAgg')
except Exception:
    pass

import jax
import jax.numpy as jnp
import numpy as np
import matplotlib.pyplot as plt
from functools import partial

jax.config.update("jax_enable_x64", True)
plt.ion()

# =====================================================================
# НАСТРОЙКА ЦЕЛЕВОГО ДАВЛЕНИЯ ДЛЯ ОТМЕТКИ НА ГРАФИКЕ (избыточное, МПа)
# =====================================================================
target_p_gauge = 0.03  # <-- Введите нужное давление (от 0.0 до 0.498 МПа)

# --- Параметры геометрии и среды ---
p0 = 0.6e6            # Начальное абсолютное давление (0.6 МПа)
patm = 0.101325e6     # Атмосферное давление (Па)
d = 0.2               # Диаметр трубы (м)
d_out = 0.0057         # Диаметр сопла (м)
gamma = 1.4           # Показатель адиабаты
n_poly = 1.2          # Политропический показатель
R = 287.0             # Газовая постоянная
T0 = 293.0            # Начальная температура (К)
mu = 1.8e-5           # Динамическая вязкость
k_rough = 5e-5        # Шероховатость
Cd = 0.47             # Коэффициент расхода сопла

A_pipe = np.pi * d**2 / 4.0
A_out = np.pi * d_out**2 / 4.0
rho0 = p0 / (R * T0)

# --- Настройка сетки и шага по времени ---
L_total = 3.0
M = 100
dx = L_total / M
idx0 = 0              # Индекс левой границы (глухого торца)

c0 = np.sqrt(gamma * R * T0)
dt = 0.4 * dx / c0
t_max = 100.0

sample_interval = max(1, int(0.005 / dt))
dt_sample = sample_interval * dt

samples_per_plot = max(1, int(0.5 / dt_sample))
total_plot_updates = int(t_max / (samples_per_plot * dt_sample))

# --- Расчет скорости на выходе и числа Маха в сопле ---
@jax.jit
def calc_nozzle(p_last, rho_last):
    T_curr = p_last / (rho_last * R)
    
    beta_crit = (2.0 / (gamma + 1.0)) ** (gamma / (gamma - 1.0))
    term_crit = (2.0 / (gamma + 1.0)) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))
    m_dot_crit = Cd * A_out * p_last * jnp.sqrt(gamma / (R * T_curr)) * term_crit

    ratio = patm / jnp.maximum(p_last, patm)
    term_sub = jnp.sqrt(jnp.maximum(0.0, (2.0 * gamma / (gamma - 1.0)) * (
        ratio**(2.0 / gamma) - ratio**((gamma + 1.0) / gamma)
    )))
    m_dot_sub = Cd * A_out * p_last * jnp.sqrt(1.0 / (R * T_curr)) * term_sub

    is_choked = (p_last > patm) & (ratio <= beta_crit)
    m_dot_out = jnp.where(p_last <= patm, 0.0, jnp.where(is_choked, m_dot_crit, m_dot_sub))
    
    v_pipe_out = m_dot_out / (rho_last * A_pipe)
    mach_nozzle = jnp.where(
        p_last <= patm, 0.0,
        jnp.where(
            is_choked,
            1.0,
            jnp.sqrt(jnp.maximum(0.0, (2.0 / (gamma - 1.0)) * (ratio**(-(gamma - 1.0) / gamma) - 1.0)))
        )
    )
    return v_pipe_out, mach_nozzle

# --- Консервативный шаг Мак-Кормака ---
@jax.jit
def jax_simulation_step(state):
    rho, m, p = state

    def get_flux_and_source(rho_arr, m_arr, p_arr):
        v_arr = m_arr / rho_arr
        Re = jnp.maximum(jnp.abs(v_arr) * d * rho_arr / mu, 10.0)
        lam = 0.11 * (k_rough / d + 68.0 / Re) ** 0.25
        S_m = -lam * rho_arr * v_arr * jnp.abs(v_arr) / (2.0 * d)
        return m_arr, m_arr * v_arr + p_arr, S_m

    # 1. ПРЕДИКТОР
    F_rho, F_m, S_m = get_flux_and_source(rho, m, p)
    rho_p = rho.at[:-1].set(rho[:-1] - (dt / dx) * (F_rho[1:] - F_rho[:-1]))
    m_p = m.at[:-1].set(m[:-1] - (dt / dx) * (F_m[1:] - F_m[:-1]) + dt * S_m[:-1])

    # Левая граница (глухая стенка x = 0): скорость нулевая
    m_p = m_p.at[idx0].set(0.0)

    # Правая граница (выход x = L)
    rho_p = rho_p.at[-1].set(rho[-1] - (dt / dx) * (F_rho[-1] - F_rho[-2]))
    rho_p = jnp.maximum(rho_p, 0.5 * patm / (R * T0))
    p_p = p0 * (rho_p / rho0) ** n_poly
    v_out_p, _ = calc_nozzle(p_p[-1], rho_p[-1])
    m_p = m_p.at[-1].set(rho_p[-1] * v_out_p)

    # 2. КОРРЕКТОР
    F_rho_p, F_m_p, S_m_p = get_flux_and_source(rho_p, m_p, p_p)
    rho_c = rho.at[1:].set(0.5 * (rho[1:] + rho_p[1:] - (dt / dx) * (F_rho_p[1:] - F_rho_p[:-1])))
    m_c = m.at[1:].set(0.5 * (m[1:] + m_p[1:] - (dt / dx) * (F_m_p[1:] - F_m_p[:-1]) + dt * S_m_p[1:]))

    # Левая граница (глухая стенка x = 0): условие отражения
    m_c = m_c.at[idx0].set(0.0)
    rho_c = rho_c.at[idx0].set(rho_c[idx0 + 1])

    # 3. Нелинейная искусственная вязкость Джеймсона
    p_tmp = p0 * (rho_c / rho0) ** n_poly
    sensor = jnp.abs(p_tmp[2:] - 2.0 * p_tmp[1:-1] + p_tmp[:-2]) / (
        p_tmp[2:] + 2.0 * p_tmp[1:-1] + p_tmp[:-2] + 1e-12
    )
    eps = jnp.minimum(0.15, 1.5 * sensor)
    
    rho_c = rho_c.at[1:-1].add(eps * (rho_c[2:] - 2.0 * rho_c[1:-1] + rho_c[:-2]))
    m_c = m_c.at[1:-1].add(eps * (m_c[2:] - 2.0 * m_c[1:-1] + m_c[:-2]))

    rho_c = jnp.maximum(rho_c, 0.5 * patm / (R * T0))
    p_c = p0 * (rho_c / rho0) ** n_poly
    v_out_c, mach_nozzle = calc_nozzle(p_c[-1], rho_c[-1])
    m_c = m_c.at[-1].set(rho_c[-1] * v_out_c)

    return (rho_c, m_c, p_c), mach_nozzle

@partial(jax.jit, static_argnums=1)
def run_sample_step(state, n_steps):
    def body(carry, _):
        next_state, mach = jax_simulation_step(carry)
        return next_state, mach
    final_state, mach_arr = jax.lax.scan(body, state, None, length=n_steps)
    return final_state, mach_arr[-1]

@partial(jax.jit, static_argnums=(1, 2))
def run_plot_chunk(state, n_samples, steps_per_sample):
    def chunk_body(carry, _):
        next_state, mach = run_sample_step(carry, steps_per_sample)
        _, _, p = next_state
        return next_state, (p[M // 2], p[idx0], mach)
    final_state, (p_mid_hist, p_end_hist, mach_hist) = jax.lax.scan(
        chunk_body, state, None, length=n_samples
    )
    return final_state, p_mid_hist, p_end_hist, mach_hist

# --- Инициализация ---
state = (jnp.full(M, rho0), jnp.zeros(M), jnp.full(M, p0))

p0_gauge = (p0 - patm) / 1e6
t_hist = [0.0]
p_mid_hist = [p0_gauge]
p_end_hist = [p0_gauge]
mach_hist = [1.0]

# --- Настройка 3 графиков ---
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(11, 9))
fig.suptitle('Волновой расчет разгерметизации трубы (избыточное давление)', fontsize=13, fontweight='bold')

# График 1: Детальный вид первых 3 секунд
line_zoom_mid, = ax1.plot(t_hist, p_mid_hist, color='blue', lw=1.5, label='Центр трубы (x = 17.5 м)')
line_zoom_end, = ax1.plot(t_hist, p_end_hist, color='green', lw=1.2, alpha=0.8, label='Глухой торец (x = 0 м)')
ax1.set_xlim(0, 3.0)
ax1.set_ylim(0.15, p0_gauge + 0.03)
ax1.set_ylabel('P избыточное (МПа)')
ax1.set_title('Первые 3 секунды: волна разрежения и отражения от стенки', fontsize=10)
ax1.grid(True, linestyle=':')
ax1.legend(loc='upper right')

# График 2: Весь процесс опорожнения до 0 МПа + красная точка
line_full_mid, = ax2.plot(t_hist, p_mid_hist, color='blue', lw=1.5, label='Избыточное давление в центре')
ax2.axhline(0.0, color='gray', linestyle='--', lw=1.0, label='Полный сброс (0 МПа)')
ax2.axhline(target_p_gauge, color='red', linestyle=':', alpha=0.5, label=f'Заданный уровень ({target_p_gauge:.3f} МПа)')

# Заготовка под красную точку и подпись
target_dot, = ax2.plot([], [], 'ro', markersize=8, zorder=5)
target_annot = ax2.annotate(
    '', xy=(0, 0), xytext=(15, 15), textcoords='offset points',
    fontsize=9, fontweight='bold', color='darkred',
    bbox=dict(boxstyle='round,pad=0.3', fc='mistyrose', ec='red', lw=1),
    arrowprops=dict(arrowstyle='->', color='red', lw=1.2),
    visible=False
)

ax2.set_xlim(0, t_max)
ax2.set_ylim(-0.02, p0_gauge + 0.05)
ax2.set_ylabel('P избыточное (МПа)')
ax2.set_title('Общий ход опорожнения трубы (падение в 0)', fontsize=10)
ax2.grid(True, linestyle=':')
ax2.legend(loc='upper right')

# График 3: Число Маха в сопле
line_mach, = ax3.plot(t_hist, mach_hist, color='darkorange', lw=1.5, label='Число Маха в сопле (M=1 — запирание)')
ax3.set_xlim(0, t_max)
ax3.set_ylim(0.0, 1.15)
ax3.set_xlabel('Время (с)')
ax3.set_ylabel('Число Маха')
ax3.grid(True, linestyle=':')
ax3.legend(loc='upper right')

plt.tight_layout()
plt.pause(0.1)

print(f"Старт расчета | Начальное P_изб = {p0_gauge:.4f} МПа | Ищем точку P = {target_p_gauge:.4f} МПа")

current_t = 0.0
marker_placed = False

for _ in range(total_plot_updates):
    state, p_mid_chunk, p_end_chunk, mach_chunk = run_plot_chunk(
        state, samples_per_plot, sample_interval
    )
    
    n_new = len(p_mid_chunk)
    new_times = current_t + np.arange(1, n_new + 1) * dt_sample
    current_t = new_times[-1]
    
    # Переводим в избыточное давление (МПа)
    new_p_mid = (np.array(p_mid_chunk) - patm) / 1e6
    new_p_end = (np.array(p_end_chunk) - patm) / 1e6
    new_mach = np.array(mach_chunk)
    
    t_hist.extend(new_times.tolist())
    p_mid_hist.extend(new_p_mid.tolist())
    p_end_hist.extend(new_p_end.tolist())
    mach_hist.extend(new_mach.tolist())
    
    # Проверяем пересечение заданного давления для установки красной точки
    if not marker_placed:
        crossed_indices = np.where(new_p_mid <= target_p_gauge)[0]
        if len(crossed_indices) > 0:
            k = crossed_indices[0]
            t_hit = float(new_times[k])
            p_hit = float(new_p_mid[k])
            
            target_dot.set_data([t_hit], [p_hit])
            target_annot.xy = (t_hit, p_hit)
            target_annot.set_text(f"P = {p_hit:.4f} МПа\nt = {t_hit:.2f} с")
            target_annot.set_visible(True)
            marker_placed = True
            print(f">>> ДОСТИГНУТО ЗАДАННОЕ ДАВЛЕНИЕ: P = {p_hit:.4f} МПа за время t = {t_hit:.2f} с <<<")

    line_zoom_mid.set_data(t_hist, p_mid_hist)
    line_zoom_end.set_data(t_hist, p_end_hist)
    line_full_mid.set_data(t_hist, p_mid_hist)
    line_mach.set_data(t_hist, mach_hist)
    
    fig.canvas.draw()
    fig.canvas.flush_events()
    plt.pause(0.01)

    print(f"t = {current_t:5.2f} с | P_центр = {p_mid_hist[-1]:6.4f} МПа | P_торец = {p_end_hist[-1]:6.4f} МПа | M_сопла = {mach_hist[-1]:.2f}")

plt.ioff()
plt.show()
