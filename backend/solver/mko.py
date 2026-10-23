import os
# НАСТРОЙКА МУЛЬТИПРОЦЕССОРНОСТИ XLA
os.environ["XLA_FLAGS"] = (
    "--xla_cpu_parallel_per_function_arity_threshold=1 "
    "--xla_extension_max_parallelism=16"
)
os.environ["OMP_NUM_THREADS"] = "16"
os.environ["MKL_NUM_THREADS"] = "16"

import matplotlib
# Принудительно задаем бэкенд для гарантированного вывода окна в реальном времени
try:
    matplotlib.use('TkAgg')
except:
    pass

import jax
import jax.numpy as jnp
import numpy as np
import matplotlib.pyplot as plt
from functools import partial

# Включаем float64 для численной стабильности
jax.config.update("jax_enable_x64", True)

# Включаем интерактивный режим графиков
plt.ion()

# --- Параметры геометрии и среды ---
p0 = 0.6e6            # Начальное давление (0.6 МПа)
patm = 0.101325e6     # Атмосферное давление
d = 0.1               # Диаметр трубы (м)
d_out = 0.025         # Диаметр сопла (м)
gamma = 1.4           # Показатель адиабаты
n_poly = 1.2          # Политропический показатель
R = 287               # Газовая постоянная
T = 293               # Температура
mu = 1.8e-5           # Динамическая вязкость
k_rough = 5e-5        # Шероховатость
Cd = 0.61             # Коэффициент расхода сопла

A_pipe = np.pi * d**2 / 4
A_out = np.pi * d_out**2 / 4
rho0 = p0 / (R * T)

# --- Настройка сетки ---
L_total = 35.0        
M = 100                  
dx = L_total / M       

dt = 0.000002           # Шаг по времени, удовлетворяющий критерию Куранта
t_max = 50.0            # Общее время расчета

block_time = 2.0      
steps_per_block = int(block_time / dt)  
total_blocks = int(t_max / block_time)

# --- Расчет расхода сопла ---
@jax.jit
def calc_v_out(p_last, rho_last):
    beta_crit = (2 / (gamma + 1)) ** (gamma / (gamma - 1))
    term_crit = (2 / (gamma + 1)) ** ((gamma + 1) / (2 * (gamma - 1)))
    m_dot_crit = Cd * A_out * p_last * jnp.sqrt(gamma / (R * T)) * term_crit
    
    ratio = patm / p_last
    term_sub = jnp.sqrt(jnp.maximum(0.0, (2 * gamma / (gamma - 1)) * (ratio**(2/gamma) - ratio**((gamma+1)/gamma))))
    m_dot_sub = Cd * A_out * p_last * jnp.sqrt(1 / (R * T)) * term_sub
    
    m_dot_out = jnp.where(p_last <= patm, 0.0, jnp.where(ratio <= beta_crit, m_dot_crit, m_dot_sub))
    return m_dot_out / (rho_last * A_pipe)

# --- Шаг Мак-Кормака с расчетом локальной невязки ---
@jax.jit
def jax_simulation_step(state):
    rho, v, p = state
    lam = 0.11 * (k_rough/d + 68 / jnp.maximum(jnp.abs(v) * d * rho / mu, 10.0))**0.25
    fric = lam * (v * jnp.abs(v)) / (2 * d)
    
    # 1. ПРЕДИКТОР (Шаг вперед)
    dp_dx_f = (p[1:] - p[:-1]) / dx
    dv_dx_f = (v[1:] - v[:-1]) / dx
    drho_dx_f = (rho[1:] - rho[:-1]) / dx
    
    v_p = v.at[:-1].set(v[:-1] - dt * (v[:-1] * dv_dx_f + (1 / rho[:-1]) * dp_dx_f + fric[:-1]))
    rho_p = rho.at[:-1].set(rho[:-1] - dt * (v[:-1] * drho_dx_f + rho[:-1] * dv_dx_f))
    
    # Граничные условия предиктора
    v_p = v_p.at[0].set(0.0)
    v_out_p = calc_v_out(p[-1], rho_p[-1])
    v_p = v_p.at[-1].set(v_out_p)
    rho_p = rho_p.at[-1].set(rho_p[-1] - dt * v_p[-1] * (rho_p[-1] - rho_p[-2]) / dx)
    
    p_p = p0 * (jnp.maximum(rho_p, patm / (R * T)) / rho0)**n_poly
    lam_p = 0.11 * (k_rough/d + 68 / jnp.maximum(jnp.abs(v_p) * d * rho_p / mu, 10.0))**0.25
    fric_p = lam_p * (v_p * jnp.abs(v_p)) / (2 * d)

    # 2. КОРРЕКТОР (Шаг назад)
    dp_dx_b = (p_p[1:] - p_p[:-1]) / dx
    dv_dx_b = (v_p[1:] - v_p[:-1]) / dx
    drho_dx_b = (rho_p[1:] - rho_p[:-1]) / dx
    
    v_final = v.at[1:].set(0.5 * (v[1:] + v_p[1:]) - 0.5 * dt * (v_p[1:] * dv_dx_b + (1 / rho_p[1:]) * dp_dx_b + fric_p[1:]))
    rho_final = rho.at[1:].set(0.5 * (rho[1:] + rho_p[1:]) - 0.5 * dt * (v_p[1:] * drho_dx_b + rho_p[1:] * dv_dx_b))
    
    # Граничные условия корректора
    v_final = v_final.at[0].set(0.0)
    v_out_final = calc_v_out(p_p[-1], rho_final[-1])
    v_final = v_final.at[-1].set(v_out_final)
    
    rho_final = rho_final.at[0].set(rho_final[0] - dt * rho_final[0] * (v_final[1] - v_final[0]) / dx)
    rho_final = rho_final.at[-1].set(rho_final[-1] - dt * v_final[-1] * (rho_final[-1] - rho_final[-2]) / dx)
    
    # 3. ТВД-сглаживание внутренних узлов (исключая границы во избежание утечек)
    tvd_coefficient = 0.02
    rho_inner = rho_final[1:-1] + tvd_coefficient * (rho_final[2:] - 2 * rho_final[1:-1] + rho_final[:-2])
    v_inner = v_final[1:-1] + tvd_coefficient * (v_final[2:] - 2 * v_final[1:-1] + v_final[:-2])
    rho_final = rho_final.at[1:-1].set(rho_inner)
    v_smoothed = v_final.at[1:-1].set(v_inner)
    
    rho_final = jnp.maximum(rho_final, patm / (R * T))
    p_final = p0 * (rho_final / rho0)**n_poly
    
    # Расчет невязки по изменению плотности
    residual = jnp.max(jnp.abs(rho_final - rho))
    
    return (rho_final, v_smoothed, p_final), residual

# Сборка шагов в блоки через jax.lax.scan
@partial(jax.jit, static_argnums=1)
def run_block(state, steps):
    def scan_body(carry, i):
        next_state, res = jax_simulation_step(carry)
        # Записываем невязку раз в 1000 шагов
        res_to_save = jnp.where(i % 1000 == 0, res, -1.0)
        return next_state, res_to_save
    
    final_state, res_hist = jax.lax.scan(scan_body, state, jnp.arange(steps))
    return final_state, res_hist

# --- Инициализация массивов ---
state = (jnp.full(M, rho0), jnp.zeros(M), jnp.full(M, p0))
time_hist, p_center_hist = [0.0], [p0 / 1e6]
residual_hist = []

# --- Инициализация окон визуализации ---
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
fig.suptitle('Мониторинг газодинамического расчета (JAX CPU)', fontsize=12, fontweight='bold')

# Верхнее окно: давление в центре трубы
line_p, = ax1.plot(time_hist, p_center_hist, color='blue', lw=2.5, label='Давление в центре')
ax1.axhline(patm / 1e6, color='red', linestyle='--', label='Атмосферное давление')
ax1.set_xlim(0, t_max)
ax1.set_ylim(0.0, 0.65)
ax1.set_ylabel('Давление (МПа)')
ax1.grid(True, linestyle=':')
ax1.legend(loc='upper right')

# Нижнее окно: невязки метода в логарифмической шкале
line_res, = ax2.plot([], [], color='purple', lw=1.5, label='Невязка (Δρ max)')
ax2.set_yscale('log')
ax2.set_xlim(0, t_max)
ax2.set_ylim(1e-12, 1e-1)
ax2.set_xlabel('Время расчета (с)')
ax2.set_ylabel('Логарифм невязки')
ax2.grid(True, which="both", linestyle=':')
ax2.legend(loc='upper right')

plt.tight_layout()
fig.canvas.draw()
fig.canvas.flush_events()
plt.pause(0.1)

print("Запуск компиляции JAX и расчета...")

# --- Главный цикл расчета ---
for b in range(1, total_blocks + 1):
    # Вычисление блока на СРU
    state, block_res = run_block(state, steps_per_block)
    rho, v, p = state
    
    current_time = b * block_time
    p_center = p[M // 2]
    
    # Вытаскиваем валидные невязки из jax-логирования
    valid_res = block_res[block_res > -0.5]
    if len(valid_res) > 0:
        residual_hist.extend(np.array(valid_res).tolist())
    
    # Обновление истории данных
    time_hist.append(current_time)
    p_center_hist.append(float(p_center / 1e6))
    
    # Передача новых точек на графики
    line_p.set_data(time_hist, p_center_hist)
    
    if len(residual_hist) > 0:
        res_time = np.linspace(0, current_time, len(residual_hist))
        line_res.set_data(res_time, residual_hist)
    
    # ФОРСИРОВАННЫЙ ВЫВОД НА ЭКРАН В РЕАЛЬНОМ ВРЕМЕНИ
    fig.canvas.draw()             # Принудительно перерисовываем линии
    fig.canvas.flush_events()      # Очищаем очередь событий GUI операционной системы
    plt.pause(0.1)                 # Передаем управление GUI-потоку на 100 мс
    
    print(f"Время: {current_time:5.1f} / {t_max} с | Давление: {p_center/1e6:5.4f} МПа | Текущая невязка: {residual_hist[-1]:.2e}")

# Отключаем интерактивный режим, чтобы зафиксировать окно после завершения
plt.ioff()
plt.show()
