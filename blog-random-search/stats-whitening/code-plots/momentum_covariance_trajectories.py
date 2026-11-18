"""Plot stochastic momentum and online full-matrix covariance preconditioning.

Run: python3 momentum_covariance_trajectories.py
Requires: numpy, matplotlib, Pillow
"""

import numpy as np

from optimization_trajectories import ORANGE, TEAL, plot_noisy_trajectory


def inverse_sqrt_times(matrix, vector, ridge):
    """Apply (matrix + ridge I)^(-1/2) without forming an inverse."""
    eigenvalues, eigenvectors = np.linalg.eigh(matrix + ridge * np.eye(2))
    return eigenvectors @ ((eigenvectors.T @ vector) / np.sqrt(eigenvalues))


def simulate(start, noise, beta, initial_step_size, ridge, preconditioned):
    """Same-step updates: g_t at w_t, then m_t/C_t, then w_(t+1)."""
    steps = len(noise)
    path = np.empty((steps + 1, 2))
    path[0] = start
    momentum = None
    covariance_estimate = np.eye(2)

    for t in range(steps):
        gradient = path[t] + noise[t]
        if t == 0:
            # The first stochastic gradient initializes momentum; the identity
            # is a finite, isotropic prior for the covariance estimate.
            momentum = gradient.copy()
        else:
            innovation = gradient - momentum
            covariance_estimate = (
                beta * covariance_estimate
                + beta * (1 - beta) * np.outer(innovation, innovation)
            )
            momentum = beta * momentum + (1 - beta) * gradient

        direction = (
            inverse_sqrt_times(covariance_estimate, momentum, ridge)
            if preconditioned else momentum
        )
        learning_rate = initial_step_size / np.sqrt(t + 1)
        path[t + 1] = path[t] - learning_rate * direction

    return path


def momentum_experiment(seed=7, steps=160):
    """Shared parameters and seeded noise for trajectory and sweep figures."""
    beta = 0.9
    initial_step_size = 0.12
    ridge = 0.1
    start = np.array([2.4, 0.0])
    covariance = np.diag([0.1, 100.0])
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal((steps, 2)) @ np.diag(np.sqrt(np.diag(covariance)))
    return dict(start=start, noise=noise, beta=beta,
                initial_step_size=initial_step_size, ridge=ridge)


def momentum_paths():
    """Return both momentum trajectories using identical seeded gradient noise."""
    experiment = momentum_experiment()
    momentum_path = simulate(**experiment, preconditioned=False)
    full_adam_path = simulate(**experiment, preconditioned=True)

    details = (
        rf"$\beta={experiment['beta']},\quad "
        rf"\eta_t={experiment['initial_step_size']}/\sqrt{{t}}$"
        + f"; {len(experiment['noise'])} noise draws, seed 7"
    )
    return momentum_path, full_adam_path, details


def main():
    momentum_path, full_adam_path, details = momentum_paths()
    for path, color, title, stem in (
        (momentum_path, ORANGE, "Stochastic momentum", "momentum"),
        (full_adam_path, TEAL,
         "Preconditioned momentum (full matrix Adam)", "preconditioned_momentum"),
    ):
        plot_noisy_trajectory(path, color, title, stem, details, gif_details=False)


if __name__ == "__main__":
    main()
