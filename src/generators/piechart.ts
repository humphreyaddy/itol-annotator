import type { PiechartOptions } from '../types';
import { assignColors } from '../core/palettes';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const piechartGenerator: Generator = {
  type: 'DATASET_PIECHART',
  defaultOptions: (): PiechartOptions => ({
    palette: 'Set2',
    radius: 25,
    scaleByTotal: false,
    borderColor: '#000000',
    borderWidth: 0.5,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as PiechartOptions;
    const cols = card.sourceColumns;
    const sliceColors = assignColors(cols, opts.palette);

    const lines: string[] = [
      'DATASET_PIECHART',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${cols.length > 0 ? sliceColors[cols[0]] : '#888888'}`,
      `FIELD_LABELS\t${cols.map((c) => safeFileName(c)).join('\t')}`,
      `FIELD_COLORS\t${cols.map((c) => sliceColors[c]).join('\t')}`,
      `BORDER_WIDTH\t${opts.borderWidth}`,
      `BORDER_COLOR\t${opts.borderColor}`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      if (!id) continue;
      const vals = cols.map((c) => {
        const n = Number((row[c] ?? '').trim());
        return Number.isFinite(n) ? n : 0;
      });
      const total = vals.reduce((a, b) => a + b, 0);
      const radius = opts.scaleByTotal && total > 0 ? Math.round(opts.radius * Math.sqrt(total)) : opts.radius;
      lines.push([id, '-1', String(radius), ...vals.map(String)].join('\t'));
    }
    return {
      filename: `piechart_${safeFileName(card.datasetLabel)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_PIECHART',
    };
  },
};
