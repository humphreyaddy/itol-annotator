import type { SymbolOptions } from '../types';
import { assignColors } from '../core/palettes';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const symbolGenerator: Generator = {
  type: 'DATASET_SYMBOL',
  defaultOptions: (): SymbolOptions => ({
    palette: 'Set1',
    defaultShape: 2,
    defaultSize: 10,
    positionOnBranch: 1,
    filled: true,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as SymbolOptions;
    const col = card.sourceColumns[0];

    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const r of table.rows) {
      const v = (r[col] ?? '').trim();
      if (v !== '' && !seen.has(v)) {
        seen.add(v);
        ordered.push(v);
      }
    }
    const auto = assignColors(ordered, opts.palette);

    const colorMap: Record<string, string> = {};
    const shapeMap: Record<string, number> = {};
    const labelMap: Record<string, string> = {};
    for (const v of ordered) {
      const pc = card.perCategory?.[v];
      colorMap[v] = pc?.color ?? auto[v];
      shapeMap[v] = pc?.shape ?? opts.defaultShape;
      labelMap[v] = pc?.legendLabel ?? v;
    }

    const lines: string[] = [
      'DATASET_SYMBOL',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${ordered.length > 0 ? colorMap[ordered[0]] : '#888888'}`,
      `LEGEND_TITLE\t${card.datasetLabel}`,
      `LEGEND_SHAPES\t${ordered.map((v) => shapeMap[v]).join('\t')}`,
      `LEGEND_COLORS\t${ordered.map((v) => colorMap[v]).join('\t')}`,
      `LEGEND_LABELS\t${ordered.map((v) => labelMap[v]).join('\t')}`,
      `MAXIMUM_SIZE\t${opts.defaultSize}`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      const v = (row[col] ?? '').trim();
      if (!id || v === '') continue;
      // ID  symbol  size  color  fill  position
      lines.push(
        [
          id,
          shapeMap[v],
          opts.defaultSize,
          colorMap[v],
          opts.filled ? 1 : 0,
          opts.positionOnBranch,
        ].join('\t'),
      );
    }
    return {
      filename: `symbol_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_SYMBOL',
    };
  },
};
