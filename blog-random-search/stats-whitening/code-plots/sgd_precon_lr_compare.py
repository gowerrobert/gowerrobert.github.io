"""SGD versus Whitened SGD, with a five-seed rate sweep.

Run: python3 code-plots/sgd_precon_lr_compare.py
Requires: numpy, matplotlib, Pillow, LaTeX (times package), dvipng
"""

import numpy as np

from optimization_trajectories import (
    INK, ORANGE, TEAL, add_noisy_trajectory, plt, save, sgd_paths,
)

SWEEP_SEEDS = (7, 8, 9, 10, 11)
TRAJECTORY_SEED = 42
STEPS = 300


def learning_rate_sweep():
    """Return final losses indexed by method, seed, and learning rate."""
    original_rates = np.geomspace(0.001, 15, 11)[:-2]
    additional_rates = np.geomspace(0.1, 1, 7)[1:-1]
    rates = np.sort(np.concatenate((original_rates, additional_rates)))
    losses = np.empty((2, len(SWEEP_SEEDS), len(rates)))
    for seed_index, seed in enumerate(SWEEP_SEEDS):
        for index, rate in enumerate(rates):
            sgd, preconditioned, _ = sgd_paths(seed=seed, initial_step_size=rate,
                                              steps=STEPS)
            for method, path in enumerate((sgd, preconditioned)):
                losses[method, seed_index, index] = 0.5 * np.sum(path[-1]**2)
    return rates, losses


def draw_comparison():
    rates, losses = learning_rate_sweep()
    best_rates = rates[np.argmin(losses.mean(axis=1), axis=1)]
    sgd, _, _ = sgd_paths(seed=TRAJECTORY_SEED, initial_step_size=best_rates[0],
                         steps=STEPS)
    _, preconditioned, _ = sgd_paths(
        seed=TRAJECTORY_SEED, initial_step_size=best_rates[1], steps=STEPS,
    )
    fig, axes = plt.subplots(1, 3, figsize=(16.5, 5.8), layout="constrained")
    trajectory_style = dict(start_marker="o", start_marker_size=35,
                            minimizer_marker="*",
                            linewidth=2.2, contour_linewidth=1.6)
    filled, _, _ = add_noisy_trajectory(axes[0], sgd, ORANGE, "SGD",
                                       **trajectory_style)
    add_noisy_trajectory(axes[1], preconditioned, TEAL, "Whitened SGD",
                         **trajectory_style)

    ax = axes[2]
    for loss, color, label in zip(
        losses, (ORANGE, TEAL), ("SGD", "Whitened SGD"),
    ):
        ax.fill_between(rates, loss.min(axis=0), loss.max(axis=0),
                        color=color, alpha=0.2, linewidth=0)
        ax.loglog(rates, loss.mean(axis=0), color=color, marker="o",
                  ms=5, lw=2.5, label=label)
    ax.set(xlabel=r"Base learning rate $\eta_0$",
           ylabel=f"Final loss ({STEPS} iterations)",
           xlim=(rates[0], rates[-1]))
    ax.set_title("Final loss vs. learning rate", fontsize=14, pad=12)
    ax.set_box_aspect(1)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(colors=INK, labelsize=10)
    ax.legend(frameon=False, fontsize=12)
    fig.colorbar(filled, ax=list(axes), label=r"Level-set loss $f(x)$",
                 shrink=0.8, pad=0.015)
    for panel in fig.axes:
        panel.tick_params(labelsize=12, width=1.2)
        panel.xaxis.label.set_fontsize(14)
        panel.yaxis.label.set_fontsize(14)
        panel.title.set_fontsize(16)
        for spine in panel.spines.values():
            spine.set_linewidth(1.2)
    print(f"Trajectory seed: {TRAJECTORY_SEED}; best mean-loss base rates: "
          f"SGD = {best_rates[0]:.6g}, Whitened SGD = {best_rates[1]:.6g}")
    save(fig, "sgd_precon_lr_compare")
    plt.close(fig)


def main():
    # Match arxiv_main.tex and the momentum comparison: Times text, TeX math.
    with plt.rc_context({
        "text.usetex": True,
        "font.family": "serif",
        "font.serif": ["Computer Modern Roman"],
        "text.latex.preamble": r"\usepackage{times}",
    }):
        draw_comparison()


if __name__ == "__main__":
    main()
