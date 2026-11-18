/* Browser adaptation of code-plots/sgd_precon_lr_compare.py and sgd_paths().
 * gradient-noise.json contains NumPy default_rng(seed).standard_normal((300, 2))
 * for seeds 42 and 7–11, rounded to ten decimal places. Both methods share draws.
 * This demo uses exact covariance, not the online estimator derived in the post.
 */
(function () {
  "use strict";
  const STEPS = 300;
  const SEEDS = [7, 8, 9, 10, 11];
  const VARIANCE_1 = 0.1;
  const NS = "http://www.w3.org/2000/svg";
  const byId = (id) => document.getElementById(id);
  const varianceInput = byId("noise-variance");
  const rateInput = byId("learning-rate");
  if (!varianceInput || !rateInput) return;

  const geometric = (start, end, count) => Array.from({ length: count }, (_, i) =>
    start * (end / start) ** (i / (count - 1)));
  // The same fourteen base rates as the Python learning_rate_sweep().
  const rates = [...geometric(0.001, 15, 11).slice(0, -2),
    ...geometric(0.1, 1, 7).slice(1, -1)].sort((a, b) => a - b);
  let normals;
  let mode = "convergence";
  let sweepCache;
  let framePending = false;
  let announceTimer;

  function number(value, digits = 3) {
    if (!Number.isFinite(value)) return "diverged";
    if (value === 0) return "0";
    if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) return value.toExponential(1);
    return Number(value.toPrecision(digits)).toString();
  }

  function simulate(seed, rate, variance, whitened) {
    const standardDeviations = [Math.sqrt(VARIANCE_1), Math.sqrt(variance)];
    const path = [[2.4, 0]];
    const losses = [0.5 * 2.4 ** 2];
    for (let t = 0; t < STEPS; t += 1) {
      const eta = rate / Math.sqrt(t + 1);
      const point = path[t].map((w, j) => {
        const gradient = w + normals[seed][t][j] * standardDeviations[j];
        return w - eta * gradient / (whitened ? standardDeviations[j] : 1);
      });
      path.push(point);
      losses.push(0.5 * (point[0] ** 2 + point[1] ** 2));
    }
    return { path, losses };
  }

  function statistics(values) {
    return { mean: values.reduce((a, b) => a + b, 0) / values.length,
      low: Math.min(...values), high: Math.max(...values) };
  }

  function computeSweep(variance) {
    if (sweepCache && sweepCache.variance === variance) return sweepCache;
    const methods = [false, true].map((whitened) => rates.map((rate) =>
      statistics(SEEDS.map((seed) => simulate(seed, rate, variance, whitened).losses[STEPS]))));
    const best = methods.map((points) => points.reduce((bestIndex, point, i) =>
      point.mean < points[bestIndex].mean ? i : bestIndex, 0));
    sweepCache = { variance, methods, best };
    return sweepCache;
  }

  function element(tag, attributes = {}, content) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function clearPlot(svg) {
    [...svg.children].forEach((child) => {
      if (child.tagName !== "title" && child.tagName !== "desc") child.remove();
    });
  }

  function label(svg, x, y, content, attributes = {}) {
    svg.appendChild(element("text", { x, y, "text-anchor": "middle", ...attributes }, content));
  }

  function trajectory(id, path, limit, method) {
    const svg = byId(id);
    clearPlot(svg);
    const left = 66, top = 20, size = 296;
    const x = (value) => left + size * (value + limit) / (2 * limit);
    const y = (value) => top + size * (limit - value) / (2 * limit);
    const clipId = `${id}-clip`;
    const definitions = element("defs");
    const clip = element("clipPath", { id: clipId });
    clip.appendChild(element("rect", { x: left, y: top, width: size, height: size }));
    definitions.appendChild(clip);
    svg.appendChild(definitions);
    const field = element("g", { "clip-path": `url(#${clipId})` });
    field.appendChild(element("rect", { x: left, y: top, width: size, height: size,
      fill: "var(--accent)", "fill-opacity": 0.045 }));
    [1.25, 1.05, 0.85, 0.65, 0.45, 0.25, 0.1].forEach((radius) => {
      field.appendChild(element("circle", { cx: x(0), cy: y(0), r: radius * size / 2,
        fill: "var(--panel)", "fill-opacity": 0.18, stroke: "var(--rule)", "stroke-width": 1 }));
    });
    [-limit, -limit / 2, 0, limit / 2, limit].forEach((tick) => {
      label(svg, x(tick), top + size + 22, number(tick, 2));
      label(svg, left - 10, y(tick) + 4, number(tick, 2), { "text-anchor": "end" });
    });
    svg.appendChild(field);
    const d = path.map((point, i) => `${i === 0 ? "M" : "L"}${x(point[0]).toFixed(2)},${y(point[1]).toFixed(2)}`).join(" ");
    field.appendChild(element("path", { d, fill: "none", class: method,
      "stroke-width": 1.8, "stroke-opacity": 0.8, "stroke-linejoin": "round" }));
    // A cross at the minimizer, a hollow start, and a filled endpoint.
    field.appendChild(element("path", { d: `M${x(0) - 5},${y(0) - 5}l10,10m-10,0l10,-10`,
      stroke: "var(--text)", "stroke-width": 2 }));
    field.appendChild(element("circle", { cx: x(path[0][0]), cy: y(path[0][1]), r: 4.5,
      fill: "var(--panel)", stroke: "var(--text)", "stroke-width": 1.5 }));
    const end = path[STEPS];
    field.appendChild(element("circle", { cx: x(end[0]), cy: y(end[1]), r: 4.5,
      class: `${method}-fill`, stroke: "var(--panel)", "stroke-width": 1.5 }));
    label(svg, left + size / 2, top + size + 46, "w₁", { class: "axis-title" });
    label(svg, 15, top + size / 2, "w₂", { class: "axis-title" });
    svg.querySelector("desc").textContent = `${STEPS} steps, seed 42. Start (2.4, 0); end (${number(end[0])}, ${number(end[1])}). Final loss ${number(0.5 * (end[0] ** 2 + end[1] ** 2))}. Both trajectories use limits ±${number(limit)}.`;
  }

  function lineChart(methods, rate) {
    const svg = byId("loss-plot");
    clearPlot(svg);
    const isSweep = mode === "sweep";
    const width = Math.max(330, Math.min(900, svg.parentElement.clientWidth));
    const height = width < 600 ? 270 : 300;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const left = 65, right = width - 18, top = 15, bottom = height - 54;
    const xs = isSweep ? rates : Array.from({ length: STEPS + 1 }, (_, i) => i);
    const logMinX = Math.log10(rates[0]), logMaxX = Math.log10(rates[rates.length - 1]);
    const x = isSweep
      ? (v) => left + (Math.log10(v) - logMinX) / (logMaxX - logMinX) * (right - left)
      : (v) => left + v / STEPS * (right - left);
    const allPoints = methods.flat();
    const minY = Math.max(1e-12, Math.min(...allPoints.map((p) => p.low)));
    const maxY = Math.max(minY * 10, ...allPoints.map((p) => p.high));
    const logMin = Math.floor(Math.log10(minY)), logMax = Math.ceil(Math.log10(maxY));
    const y = (v) => bottom - (Math.log10(Math.max(v, 10 ** logMin)) - logMin) / (logMax - logMin) * (bottom - top);
    const tickStep = Math.max(1, Math.ceil((logMax - logMin) / 5));
    for (let power = logMin; power <= logMax; power += tickStep) {
      svg.appendChild(element("line", { x1: left, y1: y(10 ** power), x2: right, y2: y(10 ** power), class: "plot-grid" }));
      label(svg, left - 12, y(10 ** power) + 4, number(10 ** power, 1), { "text-anchor": "end" });
    }
    const xTicks = isSweep ? [0.001, 0.01, 0.1, 1]
      : width < 600 ? [0, 100, 200, 300] : [0, 50, 100, 150, 200, 250, 300];
    xTicks.forEach((v) => {
      svg.appendChild(element("line", { x1: x(v), y1: top, x2: x(v), y2: bottom, class: "plot-grid" }));
      label(svg, x(v), bottom + 21, number(v));
    });
    methods.forEach((points, methodIndex) => {
      const method = methodIndex === 0 ? "sgd" : "white";
      const forward = points.map((p, i) => `${x(xs[i]).toFixed(2)},${y(p.high).toFixed(2)}`);
      const backward = points.map((p, i) => `${x(xs[i]).toFixed(2)},${y(p.low).toFixed(2)}`).reverse();
      svg.appendChild(element("polygon", { points: [...forward, ...backward].join(" "), class: `${method}-fill`, "fill-opacity": 0.12 }));
      const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(xs[i]).toFixed(2)},${y(p.mean).toFixed(2)}`).join(" ");
      svg.appendChild(element("path", { d, class: method, fill: "none", "stroke-width": 2.3, "stroke-linejoin": "round" }));
      if (isSweep) points.forEach((p, i) => {
        svg.appendChild(element("circle", { cx: x(xs[i]), cy: y(p.mean), r: 3, class: `${method}-fill` }));
      });
    });
    if (isSweep) {
      svg.appendChild(element("line", { x1: x(rate), y1: top, x2: x(rate), y2: bottom,
        stroke: "var(--text)", "stroke-width": 1, "stroke-dasharray": "4 4" }));
      label(svg, Math.max(left + 42, Math.min(right - 42, x(rate))), top + 12, `η₀ = ${number(rate)}`);
    }
    label(svg, (left + right) / 2, height - 11, isSweep ? "Base learning rate η₀ (log scale)" : "Iteration", { class: "axis-title" });
    label(svg, 18, (top + bottom) / 2, isSweep ? "Final loss" : "Loss", {
      class: "axis-title", transform: `rotate(-90 18 ${(top + bottom) / 2})` });
    byId("loss-title").textContent = isSweep ? "Final loss versus learning rate" : "Loss over iterations";
    byId("loss-desc").textContent = `Mean ${isSweep ? "final loss after 300 steps at fourteen learning rates" : "loss over 300 iterations"} over seeds 7–11, with minimum–maximum shading. ${isSweep ? "Both axes are logarithmic. The dashed line marks the selected rate." : "The loss axis is logarithmic."} Exact numerical results are in the table below.`;
  }

  function render() {
    const variance = 10 ** Number(varianceInput.value);
    const rate = 10 ** Number(rateInput.value);
    byId("variance-value").textContent = number(variance);
    byId("covariance-value").textContent = number(variance);
    byId("rate-value").textContent = number(rate);
    varianceInput.setAttribute("aria-valuetext", `${number(variance)} variance`);
    rateInput.setAttribute("aria-valuetext", `${number(rate)} base learning rate`);
    const paths = [false, true].map((white) => simulate(42, rate, variance, white));
    const maxCoordinate = Math.max(...paths.flatMap((p) => p.path.flat().map(Math.abs)));
    const limit = Math.max(3.3, Math.ceil(maxCoordinate * 1.07 * 2) / 2);
    trajectory("sgd-trajectory", paths[0].path, limit, "sgd");
    trajectory("whitened-trajectory", paths[1].path, limit, "white");
    const convergence = [false, true].map((white) => {
      const trials = SEEDS.map((seed) => simulate(seed, rate, variance, white).losses);
      return Array.from({ length: STEPS + 1 }, (_, t) => statistics(trials.map((trial) => trial[t])));
    });
    const sweep = computeSweep(variance);
    lineChart(mode === "sweep" ? sweep.methods : convergence, rate);
    const isSweep = mode === "sweep";
    byId("show-convergence").setAttribute("aria-pressed", String(!isSweep));
    byId("show-sweep").setAttribute("aria-pressed", String(isSweep));
    byId("loss-heading").textContent = isSweep ? "Final loss versus learning rate" : "Loss over iterations";
    byId("loss-caption").textContent = `Lines show mean ${isSweep ? "final loss after 300 steps" : "loss"} over five seeds; shading shows their minimum–maximum range. ${isSweep ? "Both axes are logarithmic; the dashed line marks the selected rate." : "Loss axis is logarithmic."}`;
    const finalLosses = convergence.map((method) => method[STEPS].mean);
    const winner = finalLosses[1] < finalLosses[0] ? "Whitened SGD" : "SGD";
    const factor = Math.max(...finalLosses) / Math.min(...finalLosses);
    const status = `At η₀ = ${number(rate)}, final mean loss: SGD ${number(finalLosses[0])}; Whitened SGD ${number(finalLosses[1])}. ${winner} is ${number(factor)}× lower at this setting.`;
    // Debounce announcements while a keyboard or pointer moves a slider.
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { byId("experiment-status").textContent = status; }, 180);
    const table = byId("results-table");
    table.replaceChildren();
    ["SGD", "Whitened SGD"].forEach((name, i) => {
      const tr = document.createElement("tr");
      const heading = document.createElement("th");
      heading.scope = "row";
      heading.textContent = name;
      tr.appendChild(heading);
      [number(finalLosses[i]), number(rates[sweep.best[i]]), number(sweep.methods[i][sweep.best[i]].mean)].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
  }

  function scheduleRender() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => { framePending = false; render(); });
  }

  fetch("gradient-noise.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load gradient noise");
      return response.json();
    })
    .then((data) => {
      [42, ...SEEDS].forEach((seed) => {
        if (!Array.isArray(data[seed]) || data[seed].length !== STEPS ||
          !data[seed].every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite))) {
          throw new Error("Invalid gradient noise");
        }
      });
      normals = data;
      render();
      byId("experiment-fallback").hidden = true;
      byId("interactive-experiment").hidden = false;
      [varianceInput, rateInput].forEach((input) => input.addEventListener("input", scheduleRender));
      window.addEventListener("resize", scheduleRender);
      byId("show-convergence").addEventListener("click", () => { mode = "convergence"; render(); });
      byId("show-sweep").addEventListener("click", () => { mode = "sweep"; render(); });
      byId("reset-experiment").addEventListener("click", () => {
        varianceInput.value = "2";
        rateInput.value = "-0.920819";
        mode = "convergence";
        render();
      });
    })
    .catch(() => {
      byId("experiment-loading").textContent = "The interactive experiment could not load. The original static comparison is shown below.";
    });
}());
