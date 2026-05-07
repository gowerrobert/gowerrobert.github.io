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
