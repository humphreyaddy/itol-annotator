import type { ColorstripOptions, PerCategory } from '../types';
import { assignColors } from '../core/palettes';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const colorstripGenerator: Generator = {
  type: 'DATASET_COLORSTRIP',
  defaultOptions: (): ColorstripOptions => ({
    palette: 'Set1',
    stripWidth: 25,
    borderWidth: 0.5,
    borderColor: '#000000',
    showInternal: false,
    colorBranches: false,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as ColorstripOptions;
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
    const labelMap: Record<string, string> = {};
    for (const v of ordered) {
      const pc: PerCategory | undefined = card.perCategory?.[v];
      colorMap[v] = pc?.color ?? auto[v];
      labelMap[v] = pc?.legendLabel ?? v;
    }

    const accent = ordered.length > 0 ? colorMap[ordered[0]] : '#888888';
    const lines: string[] = [
      'DATASET_COLORSTRIP',
      'SEPARATOR TAB',
      `DATASET_LABEL\t${card.datasetLabel}`,
      `COLOR\t${accent}`,
      `LEGEND_TITLE\t${card.datasetLabel}`,
      `LEGEND_SHAPES\t${ordered.map(() => '1').join('\t')}`,
      `LEGEND_COLORS\t${ordered.map((v) => colorMap[v]).join('\t')}`,
      `LEGEND_LABELS\t${ordered.map((v) => labelMap[v]).join('\t')}`,
      `STRIP_WIDTH\t${opts.stripWidth}`,
      `MARGIN\t0`,
      `BORDER_WIDTH\t${opts.borderWidth}`,
      `BORDER_COLOR\t${opts.borderColor}`,
      `SHOW_INTERNAL\t${opts.showInternal ? 1 : 0}`,
      `COLOR_BRANCHES\t${opts.colorBranches ? 1 : 0}`,
      'DATA',
    ];
    for (const row of table.rows) {
      const id = row[idColumn];
      const v = (row[col] ?? '').trim();
      if (!id || v === '') continue;
      lines.push(`${id}\t${colorMap[v]}\t${labelMap[v]}`);
    }
    return {
      filename: `colorstrip_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'DATASET_COLORSTRIP',
    };
  },
};
