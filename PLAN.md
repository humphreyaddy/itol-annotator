# iTOL Annotation Generator — Design & Implementation Plan

A free, modern, browser-only replacement for [`avantonder/itol_generator`](https://github.com/avantonder/itol_generator).
Takes a metadata table (CSV / TSV / XLSX) and produces iTOL-compatible annotation
files (`DATASET_COLORSTRIP`, `DATASET_HEATMAP`, `DATASET_BINARY`, `LABELS`,
`TREE_COLORS`, etc.), individually or as a zip. Designed for hand-off to a
coding agent to refine and implement.

---

## 1. Why this exists

`avantonder/itol_generator` is unmaintained, depends on an outdated Python
stack, has format drift against current iTOL spec, and forces researchers to
run a CLI on their own machine with various install pain. We want:

- **Zero install** — runs in the browser.
- **Zero cost** — no paid services, no infra, no iTOL Pro requirement.
- **Modern iTOL spec** — generated files must match
  https://itol.embl.de/help.cgi as of 2026.
- **GUI** — drag-and-drop, point-and-click. Researchers (and students) should
  not have to read format docs.
- **Download** — each annotation file individually OR a single `.zip`.
- **Metadata-agnostic** — the tool has **no built-in column names, no
  ontology, no hardcoded categories**. Drop microbiome metadata, clinical
  metadata, ecology metadata, anything with an ID column — the app reads the
  header row, infers datatypes, and lets the user pick what to do. Nothing
  about "phylum" or any other field is baked in; that example in the
  tutorial is just one instance of the general flow.
- **Column-first workflow** — the user (a) sees every column and its
  inferred datatype, (b) ticks which columns they want on the tree,
  (c) picks an iTOL annotation type per column from a dropdown filtered to
  what's compatible with that column's datatype, (d) configures visuals
  (palette / shape / size / scope). The order is always **column → type →
  visuals**, never type → column.

---

## 2. Security principle (non-negotiable)

> **The user's metadata must never leave their computer.**

This rules out any architecture that uploads the CSV/XLSX to a remote server
for parsing. Concretely:

| Decision                     | Why                                                |
|------------------------------|----------------------------------------------------|
| **Static SPA, no API server**| There is literally nowhere to leak the data to.    |
| **All parsing in-browser**   | SheetJS / Papa Parse run client-side.              |
| **All file generation in-browser** | iTOL `.txt` is built as a JS string and `Blob`-downloaded. |
| **No analytics / telemetry** | No third-party JS that could exfiltrate input.     |
| **Strict CSP**               | `default-src 'self'`; no remote `fetch` at runtime.|
| **No service worker that caches user files** | Avoid accidental persistence.       |
| **`Subresource Integrity`** on any CDN-loaded asset | Tamper-evident.            |
| **Run from `file://` works** | User can audit and run the bundle offline.         |

The "backend" in this design is **a folder of TypeScript modules running in
the user's browser tab**. There is no server process, no Docker, no cloud.
GitHub Pages (or any static host) is acceptable because it serves only the
app code; the user's data is processed locally.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser tab (the only thing that exists at runtime)               │
│                                                                    │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐  │
│  │  Frontend    │──▶│  Core logic      │──▶│  iTOL generators   │  │
│  │  (React +    │   │  (TS modules)    │   │  one per dataset   │  │
│  │   shadcn/ui) │◀──│  parsing,        │◀──│  type              │  │
│  │              │   │  type inference, │   │                    │  │
│  │              │   │  palette assign  │   │                    │  │
│  └──────────────┘   └──────────────────┘   └────────────────────┘  │
│         │                    │                     │               │
│         ▼                    ▼                     ▼               │
│   File picker /        Papa Parse,             JSZip for           │
│   drag-drop            SheetJS (xlsx),         multi-file          │
│                        d3-scale-chromatic,     download            │
│                        chroma-js                                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (browser download API)
                       user's Downloads folder
```

**Stack**

- **Build**: Vite + TypeScript
- **UI**: React 18, shadcn/ui (Radix primitives), Tailwind CSS, lucide-react
- **State**: Zustand (small, no boilerplate)
- **Parsing**: Papa Parse (CSV/TSV), SheetJS / `xlsx` (Excel)
- **Color**: d3-scale-chromatic, chroma-js
- **Zip**: JSZip
- **Newick parsing** (Phase 4): `phylotree.js` or a tiny custom parser
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Lint**: ESLint, Prettier, type-check on CI

**Why this stack**

- Vite + React + shadcn is the path of least resistance for a small,
  good-looking GUI in 2026 and is well supported by Claude plugins (see §10).
- All chosen libraries are MIT/BSD and ship as static JS — they run offline.
- TypeScript matters because iTOL's format is finicky; types catch mistakes.

---

## 4. iTOL annotation types in scope

Listed in implementation order (most common first). Each becomes one
"annotation card" in the GUI.

| # | iTOL type            | Accepts column type(s)                              | What it produces in iTOL                |
|---|----------------------|-----------------------------------------------------|-----------------------------------------|
| 1 | `LABELS`             | text / categorical                                  | New tip text                            |
| 2 | `DATASET_COLORSTRIP` | categorical                                         | Colored ring outside tree               |
| 3 | `TREE_COLORS`        | categorical                                         | Branch / label / clade colors           |
| 4 | `DATASET_BINARY`     | binary (1+ columns)                                 | Filled/unfilled symbols at tips         |
| 5 | `DATASET_HEATMAP`    | numeric (N columns)                                 | Multi-column heatmap ring               |
| 6 | `DATASET_SIMPLEBAR`  | numeric (1 column)                                  | Bar chart                               |
| 7 | `DATASET_GRADIENT`   | numeric (1 column)                                  | Single-column gradient                  |
| 8 | `DATASET_TEXT`       | text / categorical / numeric                        | Free text labels                        |
| 9 | `DATASET_PIECHART`   | numeric (N columns, proportions)                    | Pie chart per tip                       |
|10 | `DATASET_SYMBOL`     | categorical                                         | Geometric symbols at tips               |

Out of scope for v1: `DATASET_BOXPLOT`, `DATASET_CONNECTION`,
`DATASET_LINECHART`, `DATASET_IMAGE`. Add later only if asked.

### 4.1 Datatype → compatible annotation types (the dropdown logic)

When the user ticks a column to annotate, the GUI populates the "annotation
type" dropdown for that column from this matrix. Inferred datatypes are
**suggestions, not constraints** — the user can manually re-cast a column
(e.g. treat a numeric column as categorical for COLORSTRIP) and the dropdown
re-filters.

| Column datatype | Eligible iTOL annotation types                                                            |
|-----------------|-------------------------------------------------------------------------------------------|
| **categorical** | `DATASET_COLORSTRIP`, `TREE_COLORS`, `DATASET_SYMBOL`, `DATASET_TEXT`, `LABELS`           |
| **numeric**     | `DATASET_HEATMAP` (combine with other numeric cols), `DATASET_SIMPLEBAR`, `DATASET_GRADIENT`, `DATASET_PIECHART` (with siblings), `DATASET_TEXT` |
| **binary**      | `DATASET_BINARY`, `DATASET_COLORSTRIP`, `TREE_COLORS`, `DATASET_SYMBOL`                   |
| **text**        | `LABELS`, `DATASET_TEXT`                                                                  |

### 4.2 Per-type visual options exposed in the GUI

Every annotation type's card surfaces the iTOL fields most users actually
tune. All are optional (sensible defaults pre-filled); none are hidden in a
config file. The full iTOL spec for each type has more fields — we expose
the high-value subset and document the rest in the tooltip.

**Common to every dataset type**
- `DATASET_LABEL` — display name in iTOL legend (default: column name)
- `COLOR` — accent color for the dataset itself (default: first palette color)
- `LEGEND_TITLE`, `LEGEND_SHAPES`, `LEGEND_COLORS`, `LEGEND_LABELS` —
  auto-generated; user can override per row
- `LEGEND_POSITION_X`, `LEGEND_POSITION_Y`, `LEGEND_HORIZONTAL`,
  `LEGEND_SHAPE_SCALING` — under "Advanced"
- `MARGIN`, position (outside / inside tree)

**`DATASET_COLORSTRIP`**
- Per-category color (palette dropdown + per-row color picker)
- `STRIP_WIDTH`, `BORDER_WIDTH`, `BORDER_COLOR`, `SHOW_INTERNAL`
- `COLOR_BRANCHES` (also color the branches by the same value)

**`TREE_COLORS`**
- Per-category color
- Scope per category: `label` / `branch` / `clade` / `range`
- Branch style: `normal` / `dashed` / `dotted`
- Branch width

**`DATASET_BINARY`**
- Symbol shape per column (1=square, 2=circle, 3=star, 4=right triangle,
  5=left triangle, 6=checkmark) — dropdown shows shape preview
- Symbol fill color, outline color
- `HEIGHT_FACTOR`, symbol spacing

**`DATASET_HEATMAP`**
- Color scale: `viridis`, `plasma`, `magma`, `cividis`, `RdBu`, `RdYlBu`,
  `BrBG`, custom 3-stop
- `COLOR_MIN`, `COLOR_MID`, `COLOR_MAX`, `USE_MID_COLOR`
- Auto / manual min/mid/max values
- `STRIP_WIDTH` per column, `MARGIN`
- Optional Z-score / log10 / min-max normalization (done client-side, never
  changes the original metadata)

**`DATASET_SIMPLEBAR`**
- Bar color (single color or gradient by value)
- `WIDTH`, `HEIGHT_FACTOR`, `BAR_SHIFT`
- Axis labels, grid, scale (linear / log)

**`DATASET_GRADIENT`**
- 2-stop or 3-stop color, min/mid/max
- `STRIP_WIDTH`, normalization toggle

**`DATASET_TEXT`**
- Font size, font color, italic / bold, rotation
- Per-row override for color / size

**`DATASET_PIECHART`**
- Per-slice color (one slice per source column)
- `RADIUS`, scale-by-total toggle, `BORDER_COLOR`, `BORDER_WIDTH`

**`DATASET_SYMBOL`**
- Per-category shape (same shape vocabulary as BINARY)
- Per-category color, size, fill, position-on-branch (0.0–1.0)

**`LABELS`**
- New label per ID — driven by chosen text/categorical column
- Optional prefix / suffix string applied uniformly
- Optional truncation length

---

## 5. End-to-end user workflow (the GUI, screen by screen)

The flow is **column-first**: you never see the words "COLORSTRIP",
"HEATMAP" etc. until *after* you've picked which columns from your
metadata you want to use.

```
[Step 1] Upload metadata
   │   drag .csv / .tsv / .xlsx into dropzone
   │   (optional) drag a .nwk tree file too
   ▼
[Step 2] Confirm sheet (xlsx) + pick the ID column
   │   table preview of first 20 rows; user clicks the column
   │   whose values match the tree tip names
   ▼
[Step 3] Column profile (auto-detected)
   │   For every other column, show:
   │     - column name
   │     - inferred datatype  [categorical | numeric | binary | text]
   │     - distinct values count, null count, sample values
   │     - a small dropdown to override the inferred datatype
   ▼
[Step 4] Select variables to annotate
   │   Checkbox per column. User ticks the columns they actually want
   │   on the tree. Untouched columns are ignored — no files generated
   │   for them.
   ▼
[Step 5] Configure each ticked column (one card per column)
   │   For each ticked column, the card shows:
   │     - "Annotation type" dropdown, FILTERED to types compatible with
   │       this column's (possibly overridden) datatype — see §4.1
   │     - Type-specific options (palette, shapes, scope, scale, etc.)
   │       — see §4.2
   │     - Per-category controls (e.g. one row per unique value, with
   │       a color picker, an optional custom legend label, and — for
   │       SYMBOL/BINARY — a shape picker)
   │   The same column can be used in *multiple* annotations
   │   (e.g. both COLORSTRIP and TREE_COLORS) by clicking
   │   "+ Add another annotation for this column".
   ▼
[Step 6] (optional) Validate IDs vs tree
   │   Bucket diff (matched / metadata-only / tree-only) +
   │   fuzzy-match suggestions for near-misses.
   ▼
[Step 7] Preview
   │   Side-by-side: each generated iTOL .txt with a mini legend swatch.
   │   Inline edit-and-rewrite of any field (rename dataset, swap a
   │   color, override a legend label).
   ▼
[Step 8] Download
   │   Per-card: "Download this file" (single .txt)
   │   Global:   "Download all (.zip)"
   │             "Save config (.json)"  ← reproduce same annotations later
   │             "Load config (.json)"
```

The two consequences worth being explicit about:

- **No iTOL annotation type is ever volunteered for a column the user
  didn't tick.** Selection is opt-in, not opt-out.
- **The dropdown of "annotation type" for a given column is dynamic.** It
  is built at render time from the matrix in §4.1 against the column's
  current datatype. Change the datatype override in step 3 and the
  dropdown in step 5 re-filters.

---

## 6. Inputs and outputs (per major step)

### Step 1 — Upload metadata
- **Input**: `File` object from `<input type="file">` or drop event. MIME types:
  `text/csv`, `text/tab-separated-values`,
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  `application/vnd.ms-excel`.
- **Process**: detect type by extension + magic bytes; for xlsx read sheet
  list; for CSV/TSV sniff delimiter via Papa Parse.
- **Output**: in-memory `Table` =
  ```ts
  type Table = {
    sheetName?: string;
    columns: string[];                  // header row, deduped
    rows: Record<string, string>[];     // raw strings, no coercion yet
    rowCount: number;
  };
  ```

### Step 2 — Type inference per column (the "column profile")
- **Input**: `Table`.
- **Process**:
  - count parse-as-number ratio → numeric if ≥95% rows parse.
  - 2-value columns (`{0,1}`, `{yes,no}`, `{true,false}`, `{present,absent}`)
    → binary.
  - count of unique values vs row count → categorical if `unique ≤ 50`.
  - else text.
- **Output**:
  ```ts
  type ColumnSpec = {
    name: string;
    inferredType: 'numeric' | 'categorical' | 'binary' | 'text';
    overriddenType?: 'numeric' | 'categorical' | 'binary' | 'text';
    effectiveType: 'numeric' | 'categorical' | 'binary' | 'text'; // override ?? inferred
    uniqueValues: string[];      // truncated for big columns
    nullCount: number;
    sample: string[];            // first 5 non-null values
  };
  ```
- **GUI**: "Column profile" panel renders one row per column with the
  dropdown that lets the user override `inferredType`. The override is
  what subsequent steps key off (`effectiveType`).

### Step 2b — Variable selection
- **Input**: `ColumnSpec[]` (excluding the chosen ID column).
- **Process**: user ticks columns they want to annotate with. Each ticked
  column becomes a `SelectedColumn` whose card appears in step 4.
- **Output**:
  ```ts
  type SelectedColumn = {
    columnName: string;
    effectiveType: 'numeric' | 'categorical' | 'binary' | 'text';
  };
  ```

### Step 3 — (Optional) Tree ID validation
- **Input**: `Table` + ID column name + optional `.nwk` text.
- **Process**: Newick → list of tip names. Compare:
  ```
  matched      = tree ∩ metadata
  metadata-only = metadata − tree
  tree-only     = tree − metadata
  ```
  For each `metadata-only` ID, run Levenshtein against `tree-only` and
  surface suggestions where distance ≤ 2.
- **Output**: a `MatchReport` rendered as 3 collapsible lists in the UI.

### Step 4 — Build annotation cards (one per selected column)

For each `SelectedColumn` from step 2b, render an `AnnotationCard`. The
card's first control is an **annotation-type dropdown** populated from the
matrix in §4.1 against `effectiveType`. Picking a type swaps in that
type's option panel. The user may add a second card for the same column
(e.g. both COLORSTRIP and TREE_COLORS) — each card produces one file.

The state held per card:

```ts
type AnnotationCard = {
  id: string;                       // uuid for React key + zip filename
  sourceColumns: string[];          // 1+ columns from metadata
  annotationType: ItolType;         // chosen from filtered dropdown
  datasetLabel: string;             // editable, defaults to columns.join("+")
  options: TypeSpecificOptions;     // see §4.2
  perCategory?: Record<string, {
    color: string;
    legendLabel?: string;
    shape?: number;                 // BINARY / SYMBOL only
    scope?: 'label' | 'branch' | 'clade' | 'range';  // TREE_COLORS only
    style?: 'normal' | 'dashed' | 'dotted';
    width?: number;
  }>;
};
```

The per-type input details below describe what the card's options panel
exposes; the actual file output is whatever §4.2 spec maps to.

#### 4a. `DATASET_COLORSTRIP`
- **Input**: ID column + 1 categorical column + palette choice
  (`Set1`, `Set2`, `Tableau10`, `Paired`, custom hex list, or random).
- **Process**: assign one hex color per unique category; allow per-category
  override; allow custom legend label per category.
- **Output**: text file content
  ```
  DATASET_COLORSTRIP
  SEPARATOR TAB
  DATASET_LABEL  <user-chosen label>
  COLOR  #ff0000
  LEGEND_TITLE   <label>
  LEGEND_SHAPES  1  1  1
  LEGEND_COLORS  #1b9e77 #d95f02 #7570b3
  LEGEND_LABELS  Bacteroidota Firmicutes Proteobacteria
  STRIP_WIDTH    25
  MARGIN         0
  BORDER_WIDTH   0.5
  SHOW_INTERNAL  0
  DATA
  <id1>  #1b9e77  Bacteroidota
  <id2>  #d95f02  Firmicutes
  ...
  ```
  Filename: `colorstrip_<safe-column-name>.txt`.

#### 4b. `DATASET_HEATMAP`
- **Input**: ID column + N numeric columns + colorscale (`viridis`, `RdBu`,
  custom 3-stop) + min/max (auto or manual).
- **Process**: emit one row per ID with all column values; let iTOL handle
  rendering, but pre-bake `FIELD_LABELS`, `FIELD_COLORS`, `COLOR_MIN`,
  `COLOR_MAX`, `USE_MID_COLOR`, `COLOR_MID` headers correctly.
- **Output**: filename `heatmap_<set-name>.txt`.

#### 4c. `DATASET_BINARY`
- **Input**: ID column + N binary columns + symbol shape per column +
  filled vs empty mapping.
- **Output**: filename `binary_<set-name>.txt`. Symbols encoded as
  `1..6` per spec.

#### 4d. `LABELS`
- **Input**: ID column + a label column (e.g. `species`).
- **Output**:
  ```
  LABELS
  SEPARATOR TAB
  DATA
  <id>   <new label>
  ```
  Filename: `labels_<column>.txt`.

#### 4e. `TREE_COLORS`
- **Input**: ID column + categorical column + palette + scope per category
  (label / branch / clade) + style (normal/dashed/dotted) + width.
- **Output**: filename `tree_colors_<column>.txt`.

#### 4f. `DATASET_SIMPLEBAR` / `DATASET_GRADIENT` / `DATASET_TEXT` /
`DATASET_PIECHART` / `DATASET_SYMBOL`
- Same shape: pick column(s), pick visual options, generate file.
- Each generator is its own TS module exporting `generate(input) → string`.

### Step 5 — Preview pane
- **Input**: array of `AnnotationFile { name, content, kind }`.
- **Process**: render each in a `<pre>` with syntax highlight (lightweight,
  no Monaco needed); show a tiny legend swatch beside.
- **Output**: rendered React tree. No file is written yet.

### Step 6 — Download
- **Input**: `AnnotationFile[]`.
- **Process**:
  - Single: `new Blob([content], {type:'text/plain'})` → `URL.createObjectURL`
    → trigger `<a download>`.
  - Bulk: JSZip → `zip.file(name, content)` for each → `zip.generateAsync()`
    → blob download `itol_annotations.zip`.
- **Output**: file(s) on user's disk. **Nothing is uploaded.**

---

## 7. Project structure

```
itol_annotating/
├── PLAN.md                        ← this file
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── public/
│   └── examples/
│       ├── sample_metadata.csv
│       └── sample_tree.nwk
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/                ← shadcn-generated + custom
│   │   ├── FileDropzone.tsx
│   │   ├── ColumnPicker.tsx
│   │   ├── AnnotationCard.tsx
│   │   ├── PalettePicker.tsx
│   │   ├── PreviewPane.tsx
│   │   └── DownloadBar.tsx
│   ├── core/
│   │   ├── parse.ts               ← csv / tsv / xlsx → Table
│   │   ├── infer.ts               ← column type inference
│   │   ├── palettes.ts            ← named palettes + assignment
│   │   ├── newick.ts              ← tip extraction + diff
│   │   └── zip.ts                 ← JSZip wrapper
│   ├── generators/                ← one per iTOL type
│   │   ├── labels.ts
│   │   ├── colorstrip.ts
│   │   ├── treeColors.ts
│   │   ├── binary.ts
│   │   ├── heatmap.ts
│   │   ├── simplebar.ts
│   │   ├── gradient.ts
│   │   ├── text.ts
│   │   ├── piechart.ts
│   │   ├── symbol.ts
│   │   └── index.ts               ← registry of generators
│   ├── store/
│   │   └── useAppStore.ts         ← Zustand store
│   ├── types.ts
│   └── styles.css
└── tests/
    ├── unit/
    │   ├── parse.test.ts
    │   ├── infer.test.ts
    │   ├── colorstrip.test.ts
    │   └── ...
    └── e2e/
        └── happy-path.spec.ts     ← Playwright
```

---

## 8. Phased deliverables

Each phase ends with something demoable. Coding agent should not start phase
N+1 until phase N's deliverables are merged and the unit tests are green.

### Phase 0 — Bootstrap (½ day)
- Vite + React + TS scaffold
- Tailwind + shadcn/ui set up; one demo button rendered
- ESLint + Prettier + Vitest + Playwright wired
- GitHub repo, MIT license, CI: `pnpm install && pnpm typecheck && pnpm test`
- `CLAUDE.md` for the repo (use the `/init` skill)

**Deliverable**: empty app loads at `pnpm dev`.

### Phase 1 — Parsing + type inference + column profile (1 day)
- `core/parse.ts`: CSV (Papa Parse), TSV, XLSX (SheetJS) → `Table`
- `core/infer.ts`: numeric / categorical / binary / text
- `<FileDropzone>`, `<SheetPicker>`, `<IdColumnPicker>` components
- `<ColumnProfile>` table — one row per column showing inferred datatype
  with a dropdown to override
- `<VariableSelector>` — checkbox column on the same table to mark
  variables-to-annotate

**Deliverable**: drop any CSV/TSV/XLSX → pick the ID column → see the
column-profile table → tick columns to annotate → state shows
`SelectedColumn[]` ready for Phase 2.

**Tests**: 6+ unit tests covering edge cases (UTF-8 BOM, semicolon CSVs,
Excel dates, blank columns, duplicated headers, all-numeric IDs, manual
type override).

### Phase 2 — Generator scaffolding + first two types end-to-end (1 day)
- `generators/labels.ts` + `generators/colorstrip.ts`
- Generator registry (`generators/index.ts`) with the §4.1 compatibility
  matrix as data, not as scattered `if`s
- `<AnnotationCard>` UI: filtered annotation-type dropdown driven by the
  registry; type-specific options panel mounts dynamically
- `<PalettePicker>` (Set1, Set2, Set3, Tableau10, Paired, custom)
- Per-category color-picker rows (one per unique value), with optional
  legend-label override
- `<PreviewPane>` rendering generated `.txt`
- Single-file download via Blob

**Deliverable**: drop **any** metadata file (the tutorial's xlsx is the
acceptance fixture, but the build must not assume the column is called
"phylum" or that any specific values exist), tick a categorical column,
pick `DATASET_COLORSTRIP`, customize colors, download — output matches
the tutorial's `Phylum_category.txt`.

**Acceptance test**: byte-comparable (or visually identical) to the
hand-prepared file in the tutorial; *and* a second test using a totally
different column in a totally different metadata file produces a
correctly-formatted file too.

### Phase 3 — Remaining 8 generators + zip download (1 day)
- All 10 generators implemented; each plugs into the same registry so the
  filtered dropdown automatically gains them with no UI rewrite
- Per-card type-specific options (shapes, scales, scope, line styles, …)
  per §4.2
- "Download all as zip" via JSZip
- "Save config" / "Load config" (JSON serialization of `AnnotationCard[]`)

**Deliverable**: full feature parity with — and beyond — `itol_generator`,
no column or value strings hardcoded anywhere in the app.

### Phase 4 — Tree-aware validation (½ day)
- Optional `.nwk` upload, parsed locally
- 3-bucket diff (matched / metadata-only / tree-only)
- Fuzzy-match suggestions
- Warning banners when user tries to download with unmatched IDs

**Deliverable**: drop a real tree + metadata, get an honest mismatch report.

### Phase 5 — Hardening + security review (½ day)
- Run `/security-review` on the diff
- Add CSP meta tag, `Subresource Integrity` on any external assets
- Verify `pnpm build` output runs from `file://`
- Bundle-size budget (< 600 KB gzip target)
- a11y pass: keyboard nav, ARIA labels, color-contrast

**Deliverable**: ship-quality v1.

### Phase 6 — Docs + release (½ day)
- README with screenshots
- Sample metadata + sample tree under `public/examples/`
- A short tutorial that mirrors the workflow in
  `phylogenetics.md` § "Tree Visualisation Using iTOL"
- Tag `v1.0.0`; deploy to GitHub Pages
- Note in README explicitly contrasting with `avantonder/itol_generator`
  (what's fixed, what's new)

**Deliverable**: a URL the user can share, plus a `git clone && pnpm dev`
fallback for offline use.

Total: ~5 working days for one engineer.

---

## 9. Test strategy

- **Unit (Vitest)** — every generator has at least: a "minimal valid input"
  test, an "edge case" test (special chars in IDs, missing values, single
  category), and a "matches reference fixture" test. Fixtures live under
  `tests/unit/fixtures/`.
- **E2E (Playwright)** — one happy-path spec: launch app, drag fixture CSV,
  add 3 annotation cards, download zip, unzip, assert filenames + first 10
  bytes of each.
- **Manual** — load output into iTOL on a real tree once per phase; visually
  confirm.

---

## 10. Claude Code plugins / skills that help

These are skills and plugins to install / invoke during the build:

| Tool                          | Where it helps                                              |
|-------------------------------|-------------------------------------------------------------|
| `/init` skill                 | Generate the repo's `CLAUDE.md` after Phase 0.              |
| `/security-review` skill      | Run at the end of each phase; mandatory before v1.0.        |
| `/review` skill               | Self-review of each PR before requesting a human review.    |
| `/simplify` skill             | After Phase 3, sweep the generators for duplication.        |
| `shadcn-ui` plugin (community)| Scaffolds shadcn components on demand (`npx shadcn add ...`)|
| `playwright` MCP              | Lets the agent drive a real browser to author E2E tests.    |
| `chrome-devtools` MCP         | In-browser debugging without leaving the agent loop.        |
| `gh` CLI (built in)           | Create the repo, open PRs, manage issues.                   |

Install hint (community plugins live on the
`life-sciences`-style marketplaces; check `claude-code-marketplace` for
shadcn / playwright bundles before hand-rolling).

---

## 11. Migration notes vs `avantonder/itol_generator`

The agent should audit the upstream repo and explicitly call out, in the
README's "Differences" section:

- **Format coverage**: which iTOL dataset types upstream supports vs. ours.
  (Aim for strict superset.)
- **Bugs fixed**: anything in `avantonder/itol_generator/issues` that we
  resolve incidentally — link the issue.
- **Reproducibility**: our `.json` config file replaces upstream's "run the
  CLI again with the same flags".
- **Privacy**: explicit callout that this tool does not transmit data, in
  contrast to any browser tool that uploads to a server.

---

## 12. Risks and what we will not promise

- **iTOL spec drift**: iTOL occasionally adds fields. We pin the spec date
  in `src/generators/spec-version.ts` and surface it in the UI footer.
- **Excel weirdness**: SheetJS has known quirks with merged cells and
  non-Latin headers. We document the known list and degrade gracefully
  (warn the user, don't crash).
- **Very large metadata** (>100k rows): not a target; we'll warn above 50k
  rows but still attempt to process.
- **Newick parsing**: only basic support in v1 — we read tip names, not
  branch lengths or comments.
- **No iTOL upload-via-API**: out of scope; the user still drags files into
  iTOL themselves.

---

## 13. Definition of done for v1.0

- [ ] All 10 annotation types generate spec-compliant files.
- [ ] Drag-drop CSV/TSV/XLSX works in Chrome, Firefox, Safari.
- [ ] Single-file and zip downloads both work; no server round-trip.
- [ ] `/security-review` passes with no high or medium findings.
- [ ] Sample data + screenshots in README; live deployment URL.
- [ ] Reproduces the tutorial's `Phylum_category.txt` byte-for-byte (or
      with documented stylistic equivalences) from the supplied xlsx.
- [ ] **Metadata-agnostic**: a `grep` of the source for column names,
      taxonomic terms, or domain-specific strings (e.g. "phylum",
      "Bacteroidota", "malaria") returns **only** test fixtures and
      docs — never application code.
- [ ] Annotation-type dropdown content is derived at render time from
      the §4.1 matrix and the column's effective datatype — verified
      by a unit test that re-casts a column and asserts the dropdown
      options change.
- [ ] Runs from `file://` after `pnpm build`.
- [ ] Bundle ≤ 600 KB gzip.
- [ ] At least 30 unit tests, 1 E2E test, all green on CI.

---

## 14. Hand-off checklist for the coding agent

1. Read this file end-to-end.
2. Skim `phylogenetics.md` (the tutorial) and the upstream
   `avantonder/itol_generator` repo to understand exact upstream output
   shape. Capture any format gotchas as GitHub issues before coding.
3. Bootstrap Phase 0; confirm with the user that the chosen stack is fine
   before proceeding.
4. Implement phases in order. End each phase with: tests green +
   `/security-review` + a screenshot in the PR.
5. Do **not** add a server, an analytics SDK, a `fetch()` to anywhere
   outside the app's own origin, or a third-party iframe. If a feature
   seems to require any of those, stop and ask.
