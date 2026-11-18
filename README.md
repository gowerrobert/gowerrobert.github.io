# Robert M. Gower Homepage

This is a static homepage. The paper list on `index.html` is generated in the browser from `rob_papers.bib` by `app.js`.

## Updating Papers

Edit `rob_papers.bib`, then reload the page. Standard fields such as `title`, `author`, `year`, `journal`, `booktitle`, `url`, `doi`, and `eprint` are rendered automatically.

Optional fields create buttons:

- `preprint = {https://...}`
- `pdf = {https://...}`
- `publication = {https://...}`
- `correction = {https://...}`
- `proceedings = {https://...}`
- `code = {https://...}`
- `website = {https://...}` (shown as "Project page")
- `slides = {https://...}`
- `poster = {https://...}`
- `data = {https://...}`

Each entry also gets a `BibTeX` button using the original entry text.

## Local Preview

Because the page fetches `rob_papers.bib`, preview it with a local web server:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Random Search blog

The blog index is `blog-random-search/index.html`. Each entry is a standalone HTML page; add its title, description, date, and relative link to the index when adding a post. Blog styles live in `blog-random-search/blog.css` and inherit the homepage palette and dark mode. Equations use native MathML, with no math-rendering service or build step.

Math uses the bundled STIX Two Math font; its license is in `blog-random-search/fonts/`. Numbered displays have a stable `id`, the `data-equation` attribute, a scrollable `.equation-scroll` container, and an `.equation-number` anchor. References use `data-equation-ref` and link to the equation ID. `blog.js` refreshes the numbers in document order and opens a collapsed explanation when an equation inside it is linked directly. Keep the numbers in the HTML current as a fallback for readers without JavaScript.

The first series lives in `blog-random-search/stats-whitening/`. Its first entry, `whiten-out-variance.html`, loads the browser experiment from `whitening.js`. The controls adjust the second noise variance and the shared base learning rate. The sweep uses the same fourteen rates and seeds 7–11 as `code-plots/sgd_precon_lr_compare.py`; trajectories use seed 42. Loss curves show five-seed means with minimum–maximum bands. Both methods use the exact covariance and paired noise, with 300 updates and the original decaying learning-rate schedule.

`gradient-noise.json` stores standard-normal draws from NumPy's `default_rng(seed).standard_normal((300, 2))` for seeds 42 and 7–11, rounded to ten decimal places. Changing controls reruns the simulation in the browser. The original PNG is a fallback when JavaScript or the data request is unavailable. Preview through the local server above so the JSON request can load; the first entry is at `/blog-random-search/stats-whitening/whiten-out-variance.html`.
