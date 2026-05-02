# itol-annotator — project instructions

A browser-only React + TypeScript SPA that turns metadata tables into iTOL
annotation files. Anyone working in this repo (Claude or human) should
respect the invariants in this file.

Live: https://humphreyaddy.github.io/itol-annotator/
Repo: https://github.com/humphreyaddy/itol-annotator

## Architecture invariants — do not break

1. **Browser-only.** No backend. No server-side processing. The build output
   is a static SPA. The bundle must remain runnable from `file://` (this is
   why `vite.config.ts` sets `base: './'` and `index.html` carries a strict
   CSP). If you find yourself reaching for a server, stop and ask first.
2. **Strict CSP.** `default-src 'self'`. No third-party fetches at runtime.
   No analytics. No telemetry. No remote font CDNs. No iframes.
3. **Metadata-agnostic.** Application code must not contain any column name,
   ontology term, taxon, or domain-specific value (e.g. "phylum",
   "Bacteroidota", "malaria"). Such strings live only in tests, fixtures,
   and docs. Verified by `tests/registry.test.ts`'s grep guard.
4. **Column-first UX.** The user always (a) uploads metadata, (b) picks the
   ID column, (c) sees a column profile with auto-detected datatypes,
   (d) ticks columns to annotate, (e) picks an annotation type from a
   dropdown filtered by datatype. Never type-first.
5. **The annotation-type dropdown is data-driven.** It reads
   `ANNOTATION_COMPATIBILITY` in `src/types.ts` against each column's
   `effectiveType`. Adding a new annotation type means: write a generator
   in `src/generators/`, register it in `src/generators/index.ts`, and add
   its name to the matrix. The UI updates with no edits.
6. **No data leaves the browser.** Verified at PR time by the absence of
   any `fetch` / `XMLHttpRequest` to non-self origins.

## Stack

- Vite + React 18 + TypeScript (strict)
- Tailwind 3 + lucide-react icons
- Zustand for app state
- Papa Parse (CSV/TSV) + SheetJS (XLSX/XLS/ODS) + JSZip (zip download)
- chroma-js for color interpolation
- Vitest for unit tests (no E2E framework — the dev was supposed to be
  responsible for browser checks at each phase)

## Layout

```
src/
├── core/         pure logic (parse, infer, palettes, newick, tree, geojson, microreact, idColumn, zip)
├── generators/   one TS module per iTOL annotation type + registry
├── components/   React UI; no logic of substance lives here
├── store/        Zustand app store
└── types.ts      ALL domain types in one file
tests/            Vitest unit tests
.github/workflows/pages.yml   CI: typecheck → test → build → deploy on push to main
```

## Commands

```
npm install
npm run dev          # http://localhost:5173 — Vite + HMR
npm run typecheck
npm test             # Vitest, currently 91 tests
npm run build        # static output to dist/
npm run preview      # serve the built bundle
```

## Adding a new feature — checklist

- Read [PLAN.md](PLAN.md) for the original architectural intent.
- If you're adding a new file format (input or annotation), put the parser
  in `src/core/` and the test alongside in `tests/`.
- If you're adding a new iTOL annotation type, drop a module in
  `src/generators/`, register it in `src/generators/index.ts`, and update
  `ANNOTATION_COMPATIBILITY` in `src/types.ts`.
- Run `npm run typecheck && npm test` before committing.
- Commit messages: focus on the *why*, not the *what*. Past commits show
  the style (subject line + 1–3 paragraphs explaining motivation).
- The CI workflow runs the full suite + builds + deploys to Pages — every
  push to `main` is published live within ~1 min.

## Things never to do

- Add `fetch` to a non-self origin.
- Hardcode a column name, taxon, or any domain-specific string in `src/`.
- Bake an analytics SDK or remote font.
- Skip the type-filter on the annotation dropdown.
- Write a generator that doesn't go through the registry.
- Commit `dist/`, `node_modules/`, `*.tsbuildinfo`, or `.claude/` — they
  are gitignored for a reason.
