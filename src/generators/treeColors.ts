import type { PerCategory, TreeColorsOptions } from '../types';
import { assignColors } from '../core/palettes';
import { safeFileName } from '../core/safeName';
import type { Generator, GeneratorContext } from './types';

export const treeColorsGenerator: Generator = {
  type: 'TREE_COLORS',
  defaultOptions: (): TreeColorsOptions => ({
    palette: 'Set1',
    defaultScope: 'label',
    defaultStyle: 'normal',
    defaultWidth: 1,
  }),
  generate: (ctx: GeneratorContext) => {
    const { table, idColumn, card } = ctx;
    const opts = card.options as TreeColorsOptions;
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
    const scopeMap: Record<string, NonNullable<PerCategory['scope']>> = {};
    const styleMap: Record<string, NonNullable<PerCategory['style']>> = {};
    const widthMap: Record<string, number> = {};
    for (const v of ordered) {
      const pc = card.perCategory?.[v];
      colorMap[v] = pc?.color ?? auto[v];
      scopeMap[v] = pc?.scope ?? opts.defaultScope;
      styleMap[v] = pc?.style ?? opts.defaultStyle;
      widthMap[v] = pc?.width ?? opts.defaultWidth;
    }

    const lines: string[] = ['TREE_COLORS', 'SEPARATOR TAB', 'DATA'];
    for (const row of table.rows) {
      const id = row[idColumn];
      const v = (row[col] ?? '').trim();
      if (!id || v === '') continue;
      const scope = scopeMap[v];
      if (scope === 'label') {
        lines.push(`${id}\tlabel\t${colorMap[v]}\t${styleMap[v]}\t${widthMap[v]}`);
      } else if (scope === 'branch') {
        lines.push(`${id}\tbranch\t${colorMap[v]}\t${styleMap[v]}\t${widthMap[v]}`);
      } else if (scope === 'clade') {
        lines.push(`${id}\tclade\t${colorMap[v]}\t${styleMap[v]}\t${widthMap[v]}`);
      } else {
        lines.push(`${id}\trange\t${colorMap[v]}\t${v}`);
      }
    }
    return {
      filename: `tree_colors_${safeFileName(col)}.txt`,
      content: lines.join('\n') + '\n',
      cardId: card.id,
      annotationType: 'TREE_COLORS',
    };
  },
};
