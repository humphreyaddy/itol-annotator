import type { ItolType } from '../types';
import { ANNOTATION_COMPATIBILITY } from '../types';
import { binaryGenerator } from './binary';
import { colorstripGenerator } from './colorstrip';
import { gradientGenerator } from './gradient';
import { heatmapGenerator } from './heatmap';
import { labelsGenerator } from './labels';
import { piechartGenerator } from './piechart';
import { simpleBarGenerator } from './simplebar';
import { symbolGenerator } from './symbol';
import { textGenerator } from './text';
import { treeColorsGenerator } from './treeColors';
import type { Generator } from './types';

export const GENERATORS: Record<ItolType, Generator> = {
  LABELS: labelsGenerator,
  DATASET_COLORSTRIP: colorstripGenerator,
  TREE_COLORS: treeColorsGenerator,
  DATASET_BINARY: binaryGenerator,
  DATASET_HEATMAP: heatmapGenerator,
  DATASET_SIMPLEBAR: simpleBarGenerator,
  DATASET_GRADIENT: gradientGenerator,
  DATASET_TEXT: textGenerator,
  DATASET_PIECHART: piechartGenerator,
  DATASET_SYMBOL: symbolGenerator,
};

/** Friendly labels for the type dropdown — never overrides the iTOL spec name. */
export const TYPE_DISPLAY: Record<ItolType, string> = {
  LABELS: 'Tip labels (rename tips)',
  DATASET_COLORSTRIP: 'Color strip ring',
  TREE_COLORS: 'Branch / label / clade colors',
  DATASET_BINARY: 'Binary symbols',
  DATASET_HEATMAP: 'Heatmap (numeric, multi-column)',
  DATASET_SIMPLEBAR: 'Bar chart (1 numeric column)',
  DATASET_GRADIENT: 'Gradient strip (1 numeric column)',
  DATASET_TEXT: 'Text labels',
  DATASET_PIECHART: 'Pie chart (numeric proportions)',
  DATASET_SYMBOL: 'Geometric symbols at tips',
};

export function compatibleTypes(effectiveType: keyof typeof ANNOTATION_COMPATIBILITY): ItolType[] {
  return ANNOTATION_COMPATIBILITY[effectiveType];
}
