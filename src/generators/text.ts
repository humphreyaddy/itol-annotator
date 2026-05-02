import type { TextOptions } from '../types';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const textGenerator: Generator = {
  type: 'DATASET_TEXT',
  defaultOptions: (): TextOptions => ({
    fontSize: 1,
    fontColor: '#000000',
    bold: false,
    italic: false,
    rotation: 0,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as TextOptions;
    const col = card.sourceColumns[0];
    const styleNum = opts.italic ? (opts.bold ? 4 : 2) : opts.bold ? 3 : 1;

    const lines: string[] = [
      'DATASET_TEXT',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${opts.fontColor}`,
      `MARGIN\t0`,
      `SHOW_INTERNAL\t0`,
      `LABEL_ROTATION\t${opts.rotation}`,
      `STRAIGHT_LABELS\t0`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      const v = (row[col] ?? '').trim();
      if (!id || v === '') continue;
      // ID  label  position  color  style  size_factor
      lines.push(`${id}\t${v}\t-1\t${opts.fontColor}\t${styleNum}\t${opts.fontSize}`);
    }
    return {
      filename: `text_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_TEXT',
    };
  },
};
