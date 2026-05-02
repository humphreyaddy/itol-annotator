# iTOL annotation generator

A free, browser-only tool that turns any metadata table into
[iTOL](https://itol.embl.de/) annotation files — `DATASET_COLORSTRIP`,
`DATASET_HEATMAP`, `DATASET_BINARY`, `LABELS`, `TREE_COLORS`, and the rest —
ready to drag straight into iTOL.

**Metadata formats supported:** CSV, TSV, TAB, TXT, DAT, XLSX, XLS, ODS, JSON, GeoJSON, Microreact (`.microreact`).
**Tree formats supported (for ID validation):** Newick (`.nwk`/`.tree`/`.tre`/`.newick`), NHX (extended Newick), Nexus (`.nex`/`.nexus`, including `TRANSLATE` blocks), PhyloXML (`.xml`/`.phyloxml`), NeXML (`.nexml`), and Graphviz DOT (`.dot`/`.gv`).

A `.microreact` bundle that includes both metadata and a tree fills both
slots from a single drop.

Built as a maintained replacement for the unmaintained
[`avantonder/itol_generator`](https://github.com/avantonder/itol_generator).

## Why use this

- **Zero install.** Open `index.html` (or visit the deployed page); no server,
  no Python, no build step.
- **Zero cost.** No iTOL Pro requirement. The tool only emits files you then
  drop into iTOL's free interface.
- **Your metadata never leaves your computer.** Parsing and file generation
  happen entirely in your browser tab. The page makes no network requests
  after it loads. A strict Content-Security-Policy is set in `index.html`.
- **Metadata-agnostic.** Drop in microbiome, clinical, ecology, or any other
  metadata. The tool reads the headers and infers datatypes; nothing about
  your domain is hardcoded.
- **Column-first UX.** You see all your columns and their detected datatypes,
  tick the ones you want to use, and *then* pick the iTOL annotation type from
  a dropdown filtered to what's compatible with each column.

## Annotation types supported

| iTOL type             | Accepts                       |
|-----------------------|-------------------------------|
| `LABELS`              | text / categorical            |
| `DATASET_COLORSTRIP`  | categorical                   |
| `TREE_COLORS`         | categorical                   |
| `DATASET_BINARY`      | binary (1+ columns)           |
| `DATASET_HEATMAP`     | numeric (N columns)           |
| `DATASET_SIMPLEBAR`   | numeric (1 column)            |
| `DATASET_GRADIENT`    | numeric (1 column)            |
| `DATASET_TEXT`        | any                           |
| `DATASET_PIECHART`    | numeric (N columns)           |
| `DATASET_SYMBOL`      | categorical                   |

For each type, the GUI exposes the iTOL fields most users want to tune
(palette, strip width, border, scope, line style, color scale, normalisation,
shape, position, …) plus per-category overrides — color, legend label,
shape, scope.

## Workflow

1. Drop your `.csv` / `.tsv` / `.xlsx` into the metadata box.
   Optionally drop your `.nwk` tree to validate IDs.
2. Pick which column holds the IDs that match the tree's tip names.
3. The "column profile" table shows every other column's detected datatype
   (categorical / numeric / binary / text). Override any of them if you
   disagree with the auto-detection.
4. Tick the columns you want on your tree.
5. For each ticked column, pick an annotation type from the dropdown
   (only compatible types are shown), customize colors / shapes / sizes,
   and add per-category overrides as needed.
6. Optionally upload the Newick file to see how many of your IDs match.
7. Preview each generated `.txt` inline. Download individually, or
   "Download all (.zip)" for the whole set. "Save config" writes a `.json`
   you can reload later to reproduce the same annotations on new data.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static output in dist/
npm run preview      # serve the built bundle
npm run typecheck
npm test             # vitest, currently 40 unit tests
```

The built `dist/` folder is a fully-static SPA. You can:
- host it on GitHub Pages,
- copy it onto a USB stick and `open dist/index.html`,
- or commit it into a private repo and serve it from anywhere.

## Sample data

`public/examples/sample_metadata.csv` and `public/examples/sample_tree.nwk`
are included. They're synthetic and small; they verify that the tool runs
on a generic metadata file with no domain-specific columns.

## Architecture

```
src/
├── main.tsx, App.tsx
├── components/        ← React UI
├── core/              ← parse, infer, palettes, newick, zip, safeName
├── generators/        ← one module per iTOL type + a registry
├── store/             ← Zustand state
└── types.ts           ← all domain types in one file
tests/                 ← Vitest unit tests
```

Adding a new iTOL annotation type = add a generator file in
`src/generators/`, register it in `src/generators/index.ts`, and (if it
applies to a new datatype) update `ANNOTATION_COMPATIBILITY` in
`src/types.ts`. The dropdown in the UI updates automatically.

## Differences vs `avantonder/itol_generator`

- **Not unmaintained.** Modern stack (Vite + TypeScript + React 18).
- **No CLI to install.** Runs in the browser on any OS.
- **No data leaves your machine.** Upstream ran locally too, but ours is
  explicit about it: strict CSP, no network calls after load.
- **More annotation types** out of the box — 10 vs upstream's smaller set.
- **GUI** with column-first selection, datatype-filtered annotation
  dropdowns, per-category color / shape / scope controls, live preview, and
  zip / single-file download.
- **Save / load config** as JSON — same annotations on new data, no
  re-clicking.

## License

MIT.
