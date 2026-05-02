import type { HeatmapOptions } from '../types';
import { HEATMAP_SCALES, normalize } from '../core/palettes';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const heatmapGenerator: Generator = {
  type: 'DATASET_HEATMAP',
  defaultOptions: (): HeatmapOptions => ({
    scale: 'viridis',
    useMid: true,
    autoRange: true,
    stripWidth: 25,
    normalization: 'none',
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as HeatmapOptions;
    const cols = card.sourceColumns;
    const scale =
      HEATMAP_SCALES[opts.scale] ??
      ([opts.customMin ?? '#053061', opts.customMid ?? '#f7f7f7', opts.customMax ?? '#67001f'] as [
        string,
        string,
        string,
      ]);

    // Pre-extract & normalize per column.
    const perColMatrix: Record<string, Map<string, number>> = {};
    for (const c of cols) {
      const valuesByRow: { id: string; v: number }[] = [];
      for (const row of table.rows) {
        const id = row[idColumn];
        const raw = (row[c] ?? '').trim();
        const n = Number(raw);
        if (id && Number.isFinite(n)) valuesByRow.push({ id, v: n });
      }
      const normValues = normalize(
        valuesByRow.map((x) => x.v),
        opts.normalization,
      );
      perColMatrix[c] = new Map(valuesByRow.map((x, i) => [x.id, normValues[i]]));
    }

    const lines: string[] = [
      'DATASET_HEATMAP',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${scale[1]}`,
      `FIELD_LABELS\t${cols.map((c) => safeFileName(c)).join('\t')}`,
      `STRIP_WIDTH\t${opts.stripWidth}`,
      `USE_MID_COLOR\t${opts.useMid ? 1 : 0}`,
      `COLOR_MIN\t${scale[0]}`,
      `COLOR_MID\t${scale[1]}`,
      `COLOR_MAX\t${scale[2]}`,
    ];
    if (!opts.autoRange) {
      if (opts.manualMin !== undefined) lines.push(`USER_MIN_VALUE\t${opts.manualMin}`);
      if (opts.manualMid !== undefined) lines.push(`USER_MID_VALUE\t${opts.manualMid}`);
      if (opts.manualMax !== undefined) lines.push(`USER_MAX_VALUE\t${opts.manualMax}`);
    }
    lines.push('DATA');

    for (const row of table.rows) {
      const id = row[idColumn];
      if (!id) continue;
      const vals = cols.map((c) => {
        const v = perColMatrix[c].get(id);
        return v === undefined || !Number.isFinite(v) ? '' : String(v);
      });
      lines.push([id, ...vals].join('\t'));
    }
    return {
      filename: `heatmap_${safeFileName(card.datasetLabel)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_HEATMAP',
    };
  },
};
