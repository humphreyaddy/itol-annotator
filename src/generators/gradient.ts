import type { GradientOptions } from '../types';
import { HEATMAP_SCALES } from '../core/palettes';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const gradientGenerator: Generator = {
  type: 'DATASET_GRADIENT',
  defaultOptions: (): GradientOptions => ({
    scale: 'viridis',
    useMid: true,
    stripWidth: 25,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as GradientOptions;
    const col = card.sourceColumns[0];
    const scale = HEATMAP_SCALES[opts.scale] ?? HEATMAP_SCALES.viridis;

    const lines: string[] = [
      'DATASET_GRADIENT',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${scale[1]}`,
      `COLOR_MIN\t${scale[0]}`,
      `COLOR_MAX\t${scale[2]}`,
      `USE_MID_COLOR\t${opts.useMid ? 1 : 0}`,
      ...(opts.useMid ? [`COLOR_MID\t${scale[1]}`] : []),
      `STRIP_WIDTH\t${opts.stripWidth}`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      if (!id) continue;
      const n = Number((row[col] ?? '').trim());
      if (!Number.isFinite(n)) continue;
      lines.push(`${id}\t${n}`);
    }
    return {
      filename: `gradient_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_GRADIENT',
    };
  },
};
