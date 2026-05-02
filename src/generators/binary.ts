import type { BinaryOptions } from '../types';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

const TRUTHY = new Set(['1', 'yes', 'y', 'true', 't', 'present', 'positive', '+']);

function toBinary(v: string): 0 | 1 | -1 {
  if (v === '') return -1;
  return TRUTHY.has(v.toLowerCase()) ? 1 : 0;
}

export const binaryGenerator: Generator = {
  type: 'DATASET_BINARY',
  defaultOptions: (): BinaryOptions => ({
    defaultShape: 2,
    fillColor: '#1f78b4',
    heightFactor: 1,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as BinaryOptions;
    const cols = card.sourceColumns.length > 0 ? card.sourceColumns : [];
    const fields = cols.map(safeFileName).join('\t');
    const shapes = cols.map(() => String(opts.defaultShape)).join('\t');
    const colors = cols.map(() => opts.fillColor).join('\t');

    const lines: string[] = [
      'DATASET_BINARY',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${opts.fillColor}`,
      `FIELD_SHAPES\t${shapes}`,
      `FIELD_COLORS\t${colors}`,
      `FIELD_LABELS\t${fields}`,
      `HEIGHT_FACTOR\t${opts.heightFactor}`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      if (!id) continue;
      const cells = cols.map((c) => {
        const b = toBinary((row[c] ?? '').trim());
        return b === 1 ? '1' : b === 0 ? '0' : '-1';
      });
      lines.push([id, ...cells].join('\t'));
    }
    return {
      filename: `binary_${safeFileName(card.datasetLabel)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_BINARY',
    };
  },
};
