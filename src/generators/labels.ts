import type { LabelsOptions } from '../types';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const labelsGenerator: Generator = {
  type: 'LABELS',
  defaultOptions: (): LabelsOptions => ({
    prefix: '',
    suffix: '',
    truncate: 0,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as LabelsOptions;
    const col = card.sourceColumns[0];
    const lines: string[] = ['LABELS', 'SEPARATOR TAB', 'DATA'];
    for (const row of table.rows) {
      const id = row[idColumn];
      const v = row[col] ?? '';
      if (!id) continue;
      let label = v;
      if (opts.truncate && label.length > opts.truncate) label = label.slice(0, opts.truncate);
      label = `${opts.prefix}${label}${opts.suffix}`;
      lines.push(`${id}\t${label}`);
    }
    return {
      filename: `labels_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'LABELS',
    };
  },
};
