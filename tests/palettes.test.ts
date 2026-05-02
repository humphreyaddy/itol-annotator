import { describe, expect, it } from 'vitest';
import { assignColors, HEATMAP_SCALES, numericToColor, PALETTES } from '../src/core/palettes';
import { GENERATORS } from '../src/generators';
import type { AnnotationCard, ColumnSpec, Table } from '../src/types';

describe('Earth palette', () => {
  it('is registered in the categorical palette dropdown', () => {
    expect(PALETTES.Earth).toBeDefined();
    expect(PALETTES.Earth.length).toBeGreaterThanOrEqual(8);
  });

  it('produces deterministic per-category colors', () => {
    const out = assignColors(['A', 'B', 'C'], 'Earth');
    expect(out.A).toBe('#2b4e14');
    expect(out.B).toBe('#50a10f');
    expect(out.C).toBe('#a3c34a');
  });

  it('drives a COLORSTRIP file using the palette', () => {
    const tbl: Table = {
      columns: ['id', 'group'],
      rows: [
        { id: 'X', group: 'soil' },
        { id: 'Y', group: 'plant' },
      ],
      rowCount: 2,
    };
    const specMap: Record<string, ColumnSpec> = {};
    const card: AnnotationCard = {
      id: 'card1',
      sourceColumns: ['group'],
      annotationType: 'DATASET_COLORSTRIP',
      datasetLabel: 'group',
      options: { ...GENERATORS.DATASET_COLORSTRIP.defaultOptions(), palette: 'Earth' },
    };
    const out = GENERATORS.DATASET_COLORSTRIP.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card,
    });
    expect(out.content).toContain('#2b4e14');
    expect(out.content).toContain('#50a10f');
  });
});

describe('Verdant heatmap scale', () => {
  it('is registered', () => {
    expect(HEATMAP_SCALES.Verdant).toEqual(['#fcf5d9', '#a3c34a', '#2b4e14']);
  });

  it('interpolates correctly across the scale', () => {
    const min = numericToColor(0, 0, 1, HEATMAP_SCALES.Verdant, true).toLowerCase();
    const mid = numericToColor(0.5, 0, 1, HEATMAP_SCALES.Verdant, true).toLowerCase();
    const max = numericToColor(1, 0, 1, HEATMAP_SCALES.Verdant, true).toLowerCase();
    expect(min).toBe('#fcf5d9');
    expect(max).toBe('#2b4e14');
    expect(mid).not.toBe(min);
    expect(mid).not.toBe(max);
  });
});
