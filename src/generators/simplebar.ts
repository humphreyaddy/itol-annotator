import type { SimpleBarOptions } from '../types';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const simpleBarGenerator: Generator = {
  type: 'DATASET_SIMPLEBAR',
  defaultOptions: (): SimpleBarOptions => ({
    color: '#1f78b4',
    width: 200,
    scale: 'linear',
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as SimpleBarOptions;
    const col = card.sourceColumns[0];

    const lines: string[] = [
      'DATASET_SIMPLEBAR',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${opts.color}`,
      `WIDTH\t${opts.width}`,
      `MARGIN\t0`,
      `BAR_SHIFT\t0`,
      `LOG_SCALE\t${opts.scale === 'log' ? 1 : 0}`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      if (!id) continue;
      const v = (row[col] ?? '').trim();
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      lines.push(`${id}\t${n}`);
    }
    return {
      filename: `simplebar_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_SIMPLEBAR',
    };
  },
};
