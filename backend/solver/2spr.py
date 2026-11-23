import os
os.environ["OMP_NUM_THREADS"] = "16"
os.environ["MKL_NUM_THREADS"] = "16"

import matplotlib
try:
    matplotlib.use("TkAgg")
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
target_p_gauge = 0.15  # <-- Введите нужное давление (МПа)

# =====================================================================
# УСЛОВИЕ ОСТАНОВКИ: давление на глухом торце (избыточное, МПа)
# =====================================================================
p_stop_gauge = 1e-4    # Практический ноль (0.0001 МПа)
t_max_hard = 500.0     # Страховой лимит времени, с

# --- Параметры среды ---
p_gauge0 = 0.6e6          # Начальное ИЗБЫТОЧНОЕ давление, Па
patm = 0.101325e6         # Атмосферное давление, Па
p0 = p_gauge0 + patm      # Начальное АБСОЛЮТНОЕ давление, Па

gamma = 1.4               # Показатель адиабаты
n_poly = gamma            # Политропический показатель
R = 287.0                 # Газовая постоянная, Дж/(кг·К)
T0 = 293.0                # Начальная температура, К
mu = 1.8e-5               # Динамическая вязкость, Па·с
k_rough = 5e-5            # Шероховатость, м

rho0 = p0 / (R * T0)
c0 = np.sqrt(gamma * R * T0)

# --- Геометрия 3 ветвей ---
# Ветвь 1: основная труба, 20 м, D = 150 мм
L1, d1, M1 = 20.0, 0.150, 100
dx1 = L1 / M1
A1 = np.pi * d1**2 / 4.0

# Ветвь 2: верхний отвод от тройника к насадку
L2, d2, M2 = 10.0, 0.050, 100
dx2 = L2 / M2
A2 = np.pi * d2**2 / 4.0
d_out2, Cd2 = 0.0057, 0.47
A_out2 = np.pi * d_out2**2 / 4.0

# Ветвь 3: нижний отвод, 10 м, D = 50 мм, к насадку
L3, d3, M3 = 10.0, 0.050, 100
dx3 = L3 / M3
A3 = np.pi * d3**2 / 4.0
d_out3, Cd3 = 0.0000000012, 0.47
A_out3 = np.pi * d_out3**2 / 4.0

idx0 = 0

# --- Шаг по времени ---
dx_min = min(dx1, dx2, dx3)
CFL = 0.35
dt = CFL * dx_min / c0

sample_interval = max(1, int(0.005 / dt))
dt_sample = sample_interval * dt

samples_per_plot = max(1, int(0.5 / dt_sample))
max_plot_updates = int(t_max_hard / (samples_per_plot * dt_sample))

# --- Расчет истечения через насадок ---
@jax.jit
def calc_nozzle(p_last, rho_last, A_pipe, A_nozzle, Cd):
    T_curr = p_last / (rho_last * R)

    beta_crit = (2.0 / (gamma + 1.0)) ** (gamma / (gamma - 1.0))
    term_crit = (2.0 / (gamma + 1.0)) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))

    m_dot_crit = (
        Cd * A_nozzle * p_last
        * jnp.sqrt(gamma / (R * T_curr))
        * term_crit
    )

    ratio = patm / jnp.maximum(p_last, patm)

    term_sub = jnp.sqrt(
        jnp.maximum(
            0.0,
            (2.0 * gamma / (gamma - 1.0))
            * (
                ratio ** (2.0 / gamma)
                - ratio ** ((gamma + 1.0) / gamma)
            )
        )
    )

    m_dot_sub = (
        Cd * A_nozzle * p_last
        * jnp.sqrt(1.0 / (R * T_curr))
        * term_sub
    )

    is_choked = (p_last > patm) & (ratio <= beta_crit)

    m_dot_out = jnp.where(
        p_last <= patm,
        0.0,
        jnp.where(is_choked, m_dot_crit, m_dot_sub)
    )

    v_pipe_out = m_dot_out / (rho_last * A_pipe)

    mach_nozzle = jnp.where(
        p_last <= patm,
        0.0,
        jnp.where(
            is_choked,
            1.0,
            jnp.sqrt(
                jnp.maximum(
                    0.0,
                    (2.0 / (gamma - 1.0))
                    * (ratio ** (-(gamma - 1.0) / gamma) - 1.0)
                )
            )
        )
    )

    return v_pipe_out, mach_nozzle

# --- Шаг предиктора для одной ветви ---
def step_branch_predictor(rho, m, p, dx, d_pipe):
    v = m / rho

    Re = jnp.maximum(jnp.abs(v) * d_pipe * rho / mu, 10.0)
    lam = 0.11 * (k_rough / d_pipe + 68.0 / Re) ** 0.25

    S_m = -lam * rho * v * jnp.abs(v) / (2.0 * d_pipe)

    F_rho = m
    F_m = m * v + p

    rho_p = rho.at[:-1].set(
        rho[:-1] - (dt / dx) * (F_rho[1:] - F_rho[:-1])
    )

    m_p = m.at[:-1].set(
        m[:-1]
        - (dt / dx) * (F_m[1:] - F_m[:-1])
        + dt * S_m[:-1]
    )

    rho_p = rho_p.at[-1].set(
        rho[-1] - (dt / dx) * (F_rho[-1] - F_rho[-2])
    )

    return rho_p, m_p

# --- Шаг корректора для одной ветви ---
def step_branch_corrector(rho, m, rho_p, m_p, p_p, dx, d_pipe):
    v_p = m_p / rho_p

    Re = jnp.maximum(jnp.abs(v_p) * d_pipe * rho_p / mu, 10.0)
    lam = 0.11 * (k_rough / d_pipe + 68.0 / Re) ** 0.25

    S_m_p = -lam * rho_p * v_p * jnp.abs(v_p) / (2.0 * d_pipe)

    F_rho_p = m_p
    F_m_p = m_p * v_p + p_p

    rho_c = rho.at[1:].set(
        0.5 * (
            rho[1:]
            + rho_p[1:]
            - (dt / dx) * (F_rho_p[1:] - F_rho_p[:-1])
        )
    )

    m_c = m.at[1:].set(
        0.5 * (
            m[1:]
            + m_p[1:]
            - (dt / dx) * (F_m_p[1:] - F_m_p[:-1])
            + dt * S_m_p[1:]
        )
    )

    # Искусственная вязкость Джеймсона для внутренних узлов
    p_tmp = p0 * (rho_c / rho0) ** n_poly

    sensor = jnp.abs(
        p_tmp[2:] - 2.0 * p_tmp[1:-1] + p_tmp[:-2]
    ) / (
        p_tmp[2:] + 2.0 * p_tmp[1:-1] + p_tmp[:-2] + 1e-12
    )

    eps = jnp.where(sensor > 0.01, jnp.minimum(0.05, 0.5 * sensor), 0.0)

    rho_c = rho_c.at[1:-1].add(
        eps * (rho_c[2:] - 2.0 * rho_c[1:-1] + rho_c[:-2])
    )

    m_c = m_c.at[1:-1].add(
        eps * (m_c[2:] - 2.0 * m_c[1:-1] + m_c[:-2])
    )

    return rho_c, m_c

# --- Сопряжение в тройнике ---
def apply_tee_bc(rho1, m1, rho2, m2, rho3, m3):
    # Выравнивание давления (плотности) в тройнике с весами по площадям сечений
    A_sum_tee = A1 + A2 + A3
    rho_tee = (rho1[-1] * A1 + rho2[idx0] * A2 + rho3[idx0] * A3) / A_sum_tee
    rho_tee = jnp.maximum(rho_tee, 0.5 * patm / (R * T0))

    rho1 = rho1.at[-1].set(rho_tee)
    rho2 = rho2.at[idx0].set(rho_tee)
    rho3 = rho3.at[idx0].set(rho_tee)

    # Массовые расходы на соседних внутренних узлах (Q = rho * v * A)
    Q1_in = m1[-2] * A1
    Q2_out = m2[idx0 + 1] * A2
    Q3_out = m3[idx0 + 1] * A3

    # Невязка баланса масс в узле тройника распределяется пропорционально площадям
    dQ = Q1_in - (Q2_out + Q3_out)

    m1 = m1.at[-1].set((Q1_in - dQ * (A1 / A_sum_tee)) / A1)
    m2 = m2.at[idx0].set((Q2_out + dQ * (A2 / A_sum_tee)) / A2)
    m3 = m3.at[idx0].set((Q3_out + dQ * (A3 / A_sum_tee)) / A3)

    return rho1, m1, rho2, m2, rho3, m3

# --- Полный шаг интегрирования всей разветвленной сети ---
@jax.jit
def jax_network_step(state):
    (
        rho1, m1, p1,
        rho2, m2, p2,
        rho3, m3, p3
    ) = state

    # 1. ПРЕДИКТОР
    rho1_p, m1_p = step_branch_predictor(rho1, m1, p1, dx1, d1)
    rho2_p, m2_p = step_branch_predictor(rho2, m2, p2, dx2, d2)
    rho3_p, m3_p = step_branch_predictor(rho3, m3, p3, dx3, d3)

    # Левая стенка магистрали
    m1_p = m1_p.at[idx0].set(0.0)
    rho1_p = rho1_p.at[idx0].set(rho1_p[idx0 + 1])

    # Тройник
    rho1_p, m1_p, rho2_p, m2_p, rho3_p, m3_p = apply_tee_bc(
        rho1_p, m1_p, rho2_p, m2_p, rho3_p, m3_p
    )

    # Насадки
    rho2_p = jnp.maximum(rho2_p, 0.5 * patm / (R * T0))
    rho3_p = jnp.maximum(rho3_p, 0.5 * patm / (R * T0))

    p1_p = p0 * (rho1_p / rho0) ** n_poly
    p2_p = p0 * (rho2_p / rho0) ** n_poly
    p3_p = p0 * (rho3_p / rho0) ** n_poly

    v2_out_p, _ = calc_nozzle(
        p2_p[-1], rho2_p[-1], A2, A_out2, Cd2
    )

    v3_out_p, _ = calc_nozzle(
        p3_p[-1], rho3_p[-1], A3, A_out3, Cd3
    )

    m2_p = m2_p.at[-1].set(rho2_p[-1] * v2_out_p)
    m3_p = m3_p.at[-1].set(rho3_p[-1] * v3_out_p)

    # 2. КОРРЕКТОР
    rho1_c, m1_c = step_branch_corrector(
        rho1, m1, rho1_p, m1_p, p1_p, dx1, d1
    )

    rho2_c, m2_c = step_branch_corrector(
        rho2, m2, rho2_p, m2_p, p2_p, dx2, d2
    )

    rho3_c, m3_c = step_branch_corrector(
        rho3, m3, rho3_p, m3_p, p3_p, dx3, d3
    )

    # Левая стенка магистрали
    m1_c = m1_c.at[idx0].set(0.0)
    rho1_c = rho1_c.at[idx0].set(rho1_c[idx0 + 1])

    # Тройник
    rho1_c, m1_c, rho2_c, m2_c, rho3_c, m3_c = apply_tee_bc(
        rho1_c, m1_c, rho2_c, m2_c, rho3_c, m3_c
    )

    # Ограничение плотности
    rho1_c = jnp.maximum(rho1_c, 0.5 * patm / (R * T0))
    rho2_c = jnp.maximum(rho2_c, 0.5 * patm / (R * T0))
    rho3_c = jnp.maximum(rho3_c, 0.5 * patm / (R * T0))

    p1_c = p0 * (rho1_c / rho0) ** n_poly
    p2_c = p0 * (rho2_c / rho0) ** n_poly
    p3_c = p0 * (rho3_c / rho0) ** n_poly

    v2_out_c, mach2 = calc_nozzle(
        p2_c[-1], rho2_c[-1], A2, A_out2, Cd2
    )

    v3_out_c, mach3 = calc_nozzle(
        p3_c[-1], rho3_c[-1], A3, A_out3, Cd3
    )

    m2_c = m2_c.at[-1].set(rho2_c[-1] * v2_out_c)
    m3_c = m3_c.at[-1].set(rho3_c[-1] * v3_out_c)

    new_state = (
        rho1_c, m1_c, p1_c,
        rho2_c, m2_c, p2_c,
        rho3_c, m3_c, p3_c
    )

    return new_state, (mach2, mach3)

@partial(jax.jit, static_argnums=1)
def run_sample_step(state, n_steps):
    def body(carry, _):
        next_state, machs = jax_network_step(carry)
        return next_state, machs

    final_state, (m2_arr, m3_arr) = jax.lax.scan(
        body, state, None, length=n_steps
    )

    return final_state, (m2_arr[-1], m3_arr[-1])

@partial(jax.jit, static_argnums=(1, 2))
def run_plot_chunk(state, n_samples, steps_per_sample):
    def chunk_body(carry, _):
        next_state, (mach2, mach3) = run_sample_step(
            carry, steps_per_sample
        )
        _, _, p1, _, _, _, _, _, _ = next_state
        return next_state, (
            p1[idx0],
            p1[-1],
            mach2,
            mach3
        )

    final_state, outs = jax.lax.scan(
        chunk_body, state, None, length=n_samples
    )

    return final_state, outs

# --- Начальное состояние ---
state = (
    jnp.full(M1, rho0), jnp.zeros(M1), jnp.full(M1, p0),
    jnp.full(M2, rho0), jnp.zeros(M2), jnp.full(M2, p0),
    jnp.full(M3, rho0), jnp.zeros(M3), jnp.full(M3, p0)
)

p0_gauge = (p0 - patm) / 1e6

t_hist = [0.0]
p_deadend_hist = [p0_gauge]
p_tee_hist = [p0_gauge]
mach2_hist = [1.0]
mach3_hist = [1.0]

# --- Графики ---
# Увеличили количество подграфиков до 4 и высоту фигуры
fig, (ax1, ax2, ax3, ax4) = plt.subplots(4, 1, figsize=(11, 13))

fig.suptitle(
    "Разгерметизация разветвленного трубопровода "
    "(2 насадка Ø12 мм, Cd = 0.47)",
    fontsize=12,
    fontweight="bold"
)

# График 1: первые 3 секунды
line_z_mid, = ax1.plot(
    t_hist, p_deadend_hist,
    color="crimson", lw=1.8,
    label="Глухой торец (x = 0 м)"
)

line_z_tee, = ax1.plot(
    t_hist, p_tee_hist,
    color="steelblue", lw=1.2, alpha=0.85, linestyle="--",
    label="Узел тройника (x = 20 м)"
)

ax1.set_xlim(0, 3.0)
ax1.set_ylim(0.15, p0_gauge + 0.03)
ax1.set_ylabel("P избыточное (МПа)")
ax1.set_title(
    "Первые 3 секунды на глухом торце: задержка волны и ступенчатое падение",
    fontsize=10
)
ax1.grid(True, linestyle=":")
ax1.legend(loc="upper right")

# График 2: общий ход опорожнения
line_full_mid, = ax2.plot(
    t_hist, p_deadend_hist,
    color="crimson", lw=1.5,
    label="Давление на глухом торце"
)

ax2.axhline(
    0.0,
    color="gray",
    linestyle="--",
    lw=1.0,
    label="Полный сброс (0 МПа)"
)

ax2.axhline(
    target_p_gauge,
    color="red",
    linestyle=":",
    alpha=0.5,
    label=f"Заданный уровень ({target_p_gauge:.3f} МПа)"
)

target_dot, = ax2.plot(
    [], [],
    "ro",
    markersize=8,
    zorder=5
)

target_annot = ax2.annotate(
    "",
    xy=(0, 0),
    xytext=(15, 15),
    textcoords="offset points",
    fontsize=9,
    fontweight="bold",
    color="darkred",
    bbox=dict(
        boxstyle="round,pad=0.3",
        fc="mistyrose",
        ec="red",
        lw=1
    ),
    arrowprops=dict(
        arrowstyle="->",
        color="red",
        lw=1.2
    ),
    visible=False
)

ax2.set_xlim(0, t_max_hard)
ax2.set_ylim(-0.02, p0_gauge + 0.05)
ax2.set_ylabel("P избыточное (МПа)")
ax2.set_title(
    "Общий ход опорожнения системы (падение в 0)",
    fontsize=10
)
ax2.grid(True, linestyle=":")
ax2.legend(loc="upper right")

# График 3: числа Маха
line_m2, = ax3.plot(
    t_hist, mach2_hist,
    color="darkorange", lw=1.5,
    label="Число Маха: насадок на тройнике"
)

line_m3, = ax3.plot(
    t_hist, mach3_hist,
    color="crimson", lw=1.5, linestyle="--",
    label="Число Маха: насадок отвода 5 м"
)

ax3.set_xlim(0, t_max_hard)
ax3.set_ylim(0.0, 1.15)
ax3.set_ylabel("Число Маха")
ax3.grid(True, linestyle=":")
ax3.legend(loc="upper right")

# График 4: скорость падения давления
line_dpdt, = ax4.plot(
    t_hist, [0.0],
    color="purple", lw=1.5,
    label="Скорость падения давления (dP/dt)"
)

ax4.set_xlim(0, t_max_hard)
ax4.set_xlabel("Время (с)")
ax4.set_ylabel("dP/dt (МПа/с)")
ax4.set_title("Скорость падения давления на глухом торце", fontsize=10)
ax4.grid(True, linestyle=":")
ax4.legend(loc="upper right")

plt.tight_layout()
plt.pause(0.1)

print(
    f"Старт расчета разветвленной сети | "
    f"dt = {dt * 1e3:.3f} мс | "
    f"Ищем P = {target_p_gauge:.4f} МПа | "
    f"Остановка при P <= {p_stop_gauge:.6f} МПа"
)

current_t = 0.0
marker_placed = False
blowdown_complete = False

# =====================================================================
# ОСНОВНОЙ ЦИКЛ: работаем, пока давление на торце > p_stop_gauge
# =====================================================================
while (current_t < t_max_hard) and (not blowdown_complete):

    state, (p_dead_c, p_tee_c, m2_c, m3_c) = run_plot_chunk(
        state, samples_per_plot, sample_interval
    )

    n_new = len(p_dead_c)
    new_times = current_t + np.arange(1, n_new + 1) * dt_sample
    current_t = new_times[-1]

    new_p_dead = (np.array(p_dead_c) - patm) / 1e6
    new_p_tee = (np.array(p_tee_c) - patm) / 1e6

    t_hist.extend(new_times.tolist())
    p_deadend_hist.extend(new_p_dead.tolist())
    p_tee_hist.extend(new_p_tee.tolist())
    mach2_hist.extend(np.array(m2_c).tolist())
    mach3_hist.extend(np.array(m3_c).tolist())

    # --- Проверка достижения заданного уровня ---
    if not marker_placed:
        crossed = np.where(new_p_dead <= target_p_gauge)[0]
        if len(crossed) > 0:
            k = crossed[0]
            t_hit = float(new_times[k])
            p_hit = float(new_p_dead[k])

            target_dot.set_data([t_hit], [p_hit])
            target_annot.xy = (t_hit, p_hit)
            target_annot.set_text(
                f"Торец: P = {p_hit:.4f} МПа\nt = {t_hit:.2f} с"
            )
            target_annot.set_visible(True)
            marker_placed = True

            print(
                f">>> ДОСТИГНУТО ЗАДАННОЕ ДАВЛЕНИЕ НА ТОРЦЕ: "
                f"P = {p_hit:.4f} МПа за время t = {t_hit:.2f} с <<<"
            )

    # --- Проверка полного опорожнения (P = 0) ---
    if new_p_dead[-1] <= p_stop_gauge:
        blowdown_complete = True
        t_blowdown = current_t
        print(
            f">>> ПОЛНОЕ ОПОРОЖНЕНИЕ: P_торец = {new_p_dead[-1]:.6f} МПа "
            f"за время t = {t_blowdown:.2f} с <<<"
        )

    line_z_mid.set_data(t_hist, p_deadend_hist)
    line_z_tee.set_data(t_hist, p_tee_hist)
    line_full_mid.set_data(t_hist, p_deadend_hist)
    line_m2.set_data(t_hist, mach2_hist)
    line_m3.set_data(t_hist, mach3_hist)

    # --- Обновление графика скорости падения давления ---
    if len(t_hist) > 1:
        t_arr = np.array(t_hist)
        p_arr = np.array(p_deadend_hist)
        # Используем центральную разность для гладкого вычисления производной
        dpdt_arr = np.gradient(p_arr, t_arr)
        line_dpdt.set_data(t_arr, dpdt_arr)

    fig.canvas.draw()
    fig.canvas.flush_events()
    plt.pause(0.01)

    print(
        f"t = {current_t:5.2f} с | "
        f"P_торец = {p_deadend_hist[-1]:6.4f} МПа | "
        f"P_тройник = {p_tee_hist[-1]:6.4f} МПа | "
        f"M2 = {mach2_hist[-1]:.2f}, "
        f"M3 = {mach3_hist[-1]:.2f}"
    )

# --- Итог: время полного опорожнения ---
if blowdown_complete:
    t_blowdown = current_t
else:
    t_blowdown = current_t
    print(
        f"!!! Достигнут страховой лимит t = {t_max_hard:.1f} с, "
        f"P_торец = {p_deadend_hist[-1]:.6f} МПа (не 0) — "
        f"увеличьте t_max_hard или проверьте параметры !!!"
    )

print(
    f"ВРЕМЯ ПОЛНОГО ОПОРОЖНЕНИЯ (P = 0): t = {t_blowdown:.2f} с"
)

# --- Расчет внутреннего объема системы ---
V1 = A1 * L1
V2 = A2 * L2
V3 = A3 * L3
V_total = V1 + V2 + V3

print(
    f"Объем системы: {V_total:.4f} м³ ({V_total * 1000:.2f} л) | "
    f"Ветвь 1: {V1 * 1000:.2f} л, "
    f"Ветвь 2: {V2 * 1000:.2f} л, "
    f"Ветвь 3: {V3 * 1000:.2f} л"
)

plt.ioff()
plt.show()