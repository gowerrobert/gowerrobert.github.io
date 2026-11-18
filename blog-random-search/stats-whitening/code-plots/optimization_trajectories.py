"""Make slide-ready illustrations of curvature and gradient-noise conditioning.

Run: python3 optimization_trajectories.py
Requires: numpy, matplotlib, Pillow
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import PillowWriter
from matplotlib.colors import ListedColormap
import numpy as np


OUTPUT_DIR = Path(__file__).resolve().parent
ORANGE = "#D55E00"
TEAL = "#007F86"
INK = "#1F2933"


def add_loss_background(ax, x1, x2, values, levels, contour_linewidth=1.3):
    """Pale value colors with darker, matching contour lines."""
    base = plt.get_cmap("YlGnBu")
    colors = base(np.linspace(0, 1, 256))
    colors[:, :3] = 0.42 * colors[:, :3] + 0.58
    filled = ax.contourf(x1, x2, values, levels=levels,
                         cmap=ListedColormap(colors), extend="max")
    ax.contour(x1, x2, values, levels=levels[1:-1], cmap=base,
               linewidths=contour_linewidth, alpha=0.85)
    return filled


def style_axes(ax):
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel(r"$x_1$")
    ax.set_ylabel(r"$x_2$")
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=INK, labelsize=10)
    ax.set_axisbelow(True)


def save(fig, stem):
    for suffix in ("pdf", "png"):
        fig.savefig(
            OUTPUT_DIR / f"{stem}.{suffix}",
            dpi=240,
            bbox_inches="tight",
            facecolor="white",
        )


def save_gif(fig, stem, frame_indices, update):
    writer = PillowWriter(fps=8)
    with writer.saving(fig, str(OUTPUT_DIR / f"{stem}.gif"), dpi=170):
        for frame in list(frame_indices) + [frame_indices[-1]] * 8:
            update(frame)
            writer.grab_frame()


def add_noisy_trajectory(ax, path, color, title, *, start_marker="*",
                         minimizer_marker="X", linewidth=1.7,
                         contour_linewidth=1.3, start_marker_size=125):
    """Draw a trajectory with shared level sets, scales, and endpoint markers."""
    axis_limit = 3.3
    axis_values = np.linspace(-axis_limit, axis_limit, 380)
    x1, x2 = np.meshgrid(axis_values, axis_values)
    values = 0.5 * (x1**2 + x2**2)
    filled = add_loss_background(
        ax, x1, x2, values, [0, 0.05, 0.2, 0.5, 1, 2, 3, 4, 6, 9, 11],
        contour_linewidth=contour_linewidth,
    )
    line, = ax.plot(path[:, 0], path[:, 1], color=color, lw=linewidth,
                    alpha=0.88, zorder=3)
    if start_marker is not None:
        ax.scatter(*path[0], marker=start_marker, s=start_marker_size,
                   color=INK, zorder=6)
    marker, = ax.plot([path[-1, 0]], [path[-1, 1]], "o", ms=8,
                      color=color, markeredgecolor="white", zorder=6)
    ax.scatter(0, 0, marker=minimizer_marker,
               s=150 if minimizer_marker == "*" else 95, color=INK, zorder=6)
    ax.set_xlim(-axis_limit, axis_limit)
    ax.set_ylim(-axis_limit, axis_limit)
    ax.set_title(title, fontsize=14, pad=12)
    style_axes(ax)
    return filled, line, marker


def plot_noisy_trajectory(path, color, title, stem, details, *, gif_details=True):
    """Save one method's trajectory and its animation with shared plot scales."""
    fig, ax = plt.subplots(figsize=(7.2, 7.6), layout="constrained")
    filled, line, marker = add_noisy_trajectory(ax, path, color, title)
    fig.colorbar(filled, ax=ax, label=r"Loss $f(x)$", shrink=0.8, pad=0.02)
    heading = fig.suptitle(
        "Well-conditioned objective, ill-conditioned gradient noise\n"
        + r"$f(x)=\frac{1}{2}\|x\|^2,\quad g(x)=x+\xi,\quad "
        + r"\xi\sim\mathcal{N}(0,\Sigma)$" + "\n"
        + r"$\Sigma=\mathrm{diag}(0.1,100)$" + "\n" + details,
        fontsize=11,
    )
    save(fig, stem)
    if not gif_details:
        heading.set_text("")

    def update(frame):
        line.set_data(path[:frame + 1].T)
        marker.set_data(*path[frame].reshape(2, 1))

    save_gif(fig, stem, list(range(0, len(path), 2)), update)
    plt.close(fig)


def ill_conditioned_curvature():
    """GD on f(x)=1/2 x^T H x versus damped Newton steps."""
    hessian = np.diag([1.0, 30.0])
    gd_step_size = 1.85 / 30.0
    newton_step_size = 0.35
    start = np.array([3.4, 1.15])
    gd_steps = 32
    newton_steps = 8

    gd = np.empty((gd_steps + 1, 2))
    gd[0] = start
    for t in range(gd_steps):
        gd[t + 1] = gd[t] - gd_step_size * (hessian @ gd[t])
    newton = np.empty((newton_steps + 1, 2))
    newton[0] = start
    for t in range(newton_steps):
        newton[t + 1] = (
            newton[t] - newton_step_size * np.linalg.solve(hessian, hessian @ newton[t])
        )
    assert np.linalg.norm(newton[1]) < np.linalg.norm(newton[0])
    assert not np.allclose(newton[1], 0.0)

    fig, ax = plt.subplots(figsize=(9.2, 5.6), layout="constrained")
    x1, x2 = np.meshgrid(np.linspace(-0.45, 3.8, 420), np.linspace(-1.55, 1.55, 360))
    values = 0.5 * (x1**2 + 30 * x2**2)
    levels = [0, 0.04, 0.12, 0.3, 0.7, 1.5, 3, 6, 10, 15, 22, 30]
    filled = add_loss_background(ax, x1, x2, values, levels)
    fig.colorbar(filled, ax=ax, label=r"Loss $f(x)$", shrink=0.84, pad=0.03)

    gd_line, = ax.plot(gd[:, 0], gd[:, 1], color=ORANGE, lw=2.4, marker="o", ms=3.2,
                       label=f"Gradient descent ({gd_steps} steps)", zorder=4)
    newton_line, = ax.plot(newton[:, 0], newton[:, 1], color=TEAL, lw=2.6,
                           marker="D", ms=5.0, label=f"Damped Newton ({newton_steps} steps)",
                           zorder=5)
    # Arrowheads make the back-and-forth movement easy to read on a slide.
    arrows = []
    for t in range(7):
        arrows.append(ax.annotate("", xy=gd[t + 1], xytext=gd[t],
                                  arrowprops={"arrowstyle": "->", "color": ORANGE,
                                              "lw": 1.7, "mutation_scale": 12}, zorder=6))
    ax.scatter(*start, marker="*", s=150, color=INK, zorder=7)
    ax.scatter(0, 0, marker="X", s=115, color=INK, zorder=7)
    ax.annotate("start", start, xytext=(7, 9), textcoords="offset points", color=INK)
    ax.annotate("minimum", (0, 0), xytext=(8, -15), textcoords="offset points", color=INK)

    ax.set_xlim(-0.45, 3.8)
    ax.set_ylim(-1.55, 1.55)
    ax.set_title("Ill-conditioned curvature: gradient descent zigzags", fontsize=15, pad=14)
    ax.text(0.02, 0.96, r"$f(x)=\frac{1}{2}(x_1^2+30x_2^2)$" + "\n"
            + rf"$\eta_{{\mathrm{{GD}}}}={gd_step_size:.3f},\; "
            + rf"\eta_{{\mathrm{{Newton}}}}={newton_step_size}$",
            transform=ax.transAxes,
            ha="left", va="top", color=INK, fontsize=11,
            bbox={"facecolor": "white", "edgecolor": "none", "alpha": 0.78,
                  "boxstyle": "round,pad=0.2"})
    ax.legend(loc="lower right", frameon=True, facecolor="white", framealpha=0.94)
    style_axes(ax)
    save(fig, "ill_conditioned_curvature")

    for arrow in arrows:
        arrow.remove()

    gd_current, = ax.plot([], [], "o", color=ORANGE, ms=9, zorder=8)
    newton_current, = ax.plot([], [], "D", color=TEAL, ms=9, zorder=8)

    def update(frame):
        newton_frame = min(frame, newton_steps)
        gd_line.set_data(gd[:frame + 1].T)
        newton_line.set_data(newton[:newton_frame + 1].T)
        gd_current.set_data(*gd[frame].reshape(2, 1))
        newton_current.set_data(*newton[newton_frame].reshape(2, 1))

    save_gif(fig, "ill_conditioned_curvature", list(range(gd_steps + 1)), update)
    plt.close(fig)


def sgd_paths(seed=7, initial_step_size=0.12, steps=160):
    """SGD and exact-covariance preconditioned SGD with paired noise.

    For g_t = w_t + xi_t, Cov(g_t | w_t) = diag(0.1, 100).
    Apply its exact inverse square root, with no covariance estimation or ridge.
    """
    rng = np.random.default_rng(seed)
    covariance = np.diag([0.1, 100.0])
    sqrt_covariance = np.diag(np.sqrt(np.diag(covariance)))
    inverse_sqrt_covariance = np.diag(1.0 / np.sqrt(np.diag(covariance)))
    # Start at the optimum in the noisy coordinate to isolate its stochastic motion.
    start = np.array([2.4, 0.0])
    noise = rng.standard_normal((steps, 2)) @ sqrt_covariance

    sgd = np.empty((steps + 1, 2))
    preconditioned = np.empty_like(sgd)
    sgd[0] = preconditioned[0] = start
    for t in range(steps):
        learning_rate = initial_step_size / np.sqrt(t + 1)
        sgd[t + 1] = sgd[t] - learning_rate * (sgd[t] + noise[t])
        gradient = preconditioned[t] + noise[t]
        preconditioned[t + 1] = (
            preconditioned[t] - learning_rate * (inverse_sqrt_covariance @ gradient)
        )

    details = (
        rf"$\eta_t={initial_step_size}/\sqrt{{t}}$ ($t=1,\ldots,{steps}$)"
        + f"; {steps} noise draws, seed {seed}"
    )
    return sgd, preconditioned, details


def noisy_gradients():
    """Compare SGD and covariance-preconditioned SGD using the same noise draws."""
    sgd, preconditioned, details = sgd_paths()
    for path, color, title, stem in (
        (sgd, ORANGE, "SGD: noise dominates one direction", "sgd"),
        (preconditioned, TEAL,
         r"Preconditioned SGD: $-\Sigma^{-1/2}g(x)$", "preconditioned_sgd"),
    ):
        plot_noisy_trajectory(path, color, title, stem, details)


if __name__ == "__main__":
    ill_conditioned_curvature()
    noisy_gradients()
