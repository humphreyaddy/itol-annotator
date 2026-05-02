/**
 * Domain types. No iTOL annotation type, no metadata column name, and no
 * "real-world" value (taxa, regions, …) is ever hardcoded in the app —
 * everything is read from the user's file at runtime.
 */

export type ColumnType = 'numeric' | 'categorical' | 'binary' | 'text';

export type Table = {
  sheetName?: string;
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

export type ColumnSpec = {
  name: string;
  inferredType: ColumnType;
  overriddenType?: ColumnType;
  /** override ?? inferred — what the rest of the app keys off. */
  effectiveType: ColumnType;
  uniqueValues: string[];
  uniqueCount: number;
  nullCount: number;
  sample: string[];
  numericMin?: number;
  numericMax?: number;
};

export type ItolType =
  | 'LABELS'
  | 'DATASET_COLORSTRIP'
  | 'TREE_COLORS'
  | 'DATASET_BINARY'
  | 'DATASET_HEATMAP'
  | 'DATASET_SIMPLEBAR'
  | 'DATASET_GRADIENT'
  | 'DATASET_TEXT'
  | 'DATASET_PIECHART'
  | 'DATASET_SYMBOL';

/**
 * Drives the per-column "annotation type" dropdown. Stored as data, not
 * scattered if-statements — adding a new type means editing this object
 * and adding the generator module, nothing else.
 */
export const ANNOTATION_COMPATIBILITY: Record<ColumnType, ItolType[]> = {
  categorical: [
    'DATASET_COLORSTRIP',
    'TREE_COLORS',
    'DATASET_SYMBOL',
    'DATASET_TEXT',
    'LABELS',
  ],
  numeric: [
    'DATASET_HEATMAP',
    'DATASET_SIMPLEBAR',
    'DATASET_GRADIENT',
    'DATASET_PIECHART',
    'DATASET_TEXT',
  ],
  binary: [
    'DATASET_BINARY',
    'DATASET_COLORSTRIP',
    'TREE_COLORS',
    'DATASET_SYMBOL',
  ],
  text: ['LABELS', 'DATASET_TEXT'],
};

export type ItolScope = 'label' | 'branch' | 'clade' | 'range';
export type ItolLineStyle = 'normal' | 'dashed' | 'dotted';

export type PerCategory = {
  color: string;
  legendLabel?: string;
  /** 1=square 2=circle 3=star 4=right-tri 5=left-tri 6=checkmark — iTOL spec */
  shape?: number;
  scope?: ItolScope;
  style?: ItolLineStyle;
  width?: number;
};

export type ColorstripOptions = {
  palette: string;
  stripWidth: number;
  borderWidth: number;
  borderColor: string;
  showInternal: boolean;
  colorBranches: boolean;
};

export type TreeColorsOptions = {
  palette: string;
  defaultScope: ItolScope;
  defaultStyle: ItolLineStyle;
  defaultWidth: number;
};

export type BinaryOptions = {
  defaultShape: number;
  fillColor: string;
  heightFactor: number;
};

export type HeatmapOptions = {
  /** name of a built-in scale (viridis, plasma, RdBu, …) or "custom". */
  scale: string;
  customMin?: string;
  customMid?: string;
  customMax?: string;
  useMid: boolean;
  autoRange: boolean;
  manualMin?: number;
  manualMid?: number;
  manualMax?: number;
  stripWidth: number;
  normalization: 'none' | 'zscore' | 'log10' | 'minmax';
};

export type SimpleBarOptions = {
  color: string;
  width: number;
  scale: 'linear' | 'log';
};

export type GradientOptions = {
  scale: string;
  useMid: boolean;
  stripWidth: number;
};

export type TextOptions = {
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  rotation: number;
};

export type PiechartOptions = {
  palette: string;
  radius: number;
  scaleByTotal: boolean;
  borderColor: string;
  borderWidth: number;
};

export type SymbolOptions = {
  palette: string;
  defaultShape: number;
  defaultSize: number;
  positionOnBranch: number;
  filled: boolean;
};

export type LabelsOptions = {
  prefix: string;
  suffix: string;
  truncate: number;
};

export type AnnotationOptionsByType = {
  DATASET_COLORSTRIP: ColorstripOptions;
  TREE_COLORS: TreeColorsOptions;
  DATASET_BINARY: BinaryOptions;
  DATASET_HEATMAP: HeatmapOptions;
  DATASET_SIMPLEBAR: SimpleBarOptions;
  DATASET_GRADIENT: GradientOptions;
  DATASET_TEXT: TextOptions;
  DATASET_PIECHART: PiechartOptions;
  DATASET_SYMBOL: SymbolOptions;
  LABELS: LabelsOptions;
};

/**
 * Options is intentionally a free-form record at the AnnotationCard level — each
 * generator narrows it to its own typed options shape (`ColorstripOptions`,
 * `HeatmapOptions`, …) at use time. We don't try to discriminate the union on
 * `annotationType` here because the runtime invariant (type ⇄ options swapped
 * together via `changeCardType`) is enforced in the store, not at the type
 * boundary.
 */
export type AnnotationCard = {
  id: string;
  /** 1+ columns from metadata. Most types use one; HEATMAP/PIECHART use many. */
  sourceColumns: string[];
  annotationType: ItolType;
  datasetLabel: string;
  options: Record<string, unknown>;
  perCategory?: Record<string, PerCategory>;
};

export type GeneratedFile = {
  filename: string;
  content: string;
  cardId: string;
  annotationType: ItolType;
};

export type SavedConfig = {
  schemaVersion: 1;
  idColumn: string | null;
  cards: AnnotationCard[];
  /** Recorded for diagnostic purposes. We DO NOT serialize the metadata itself. */
  generatedAt: string;
};
