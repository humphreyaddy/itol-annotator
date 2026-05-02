import { describe, expect, it } from 'vitest';
import { GENERATORS } from '../src/generators';
import type { AnnotationCard, ColumnSpec, Table } from '../src/types';
import { profileTable } from '../src/core/infer';

const tbl: Table = {
  columns: ['id', 'phylum', 'cohort', 'completeness', 'contamination', 'present'],
  rows: [
    { id: 'A', phylum: 'Firmicutes', cohort: 'control', completeness: '95', contamination: '1', present: '1' },
    { id: 'B', phylum: 'Bacteroidota', cohort: 'case', completeness: '88', contamination: '2.5', present: '0' },
    { id: 'C', phylum: 'Firmicutes', cohort: 'case', completeness: '70', contamination: '5', present: '1' },
  ],
  rowCount: 3,
};

const specs: ColumnSpec[] = profileTable(tbl, 'id');
const specMap: Record<string, ColumnSpec> = Object.fromEntries(specs.map((s) => [s.name, s]));

function card(over: Partial<AnnotationCard>): AnnotationCard {
  return {
    id: 'test',
    sourceColumns: [],
    annotationType: over.annotationType!,
    datasetLabel: over.datasetLabel ?? 'test',
    options: over.options as never,
    perCategory: over.perCategory,
    ...over,
  } as AnnotationCard;
}

describe('LABELS generator', () => {
  it('produces a LABELS file', () => {
    const out = GENERATORS.LABELS.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'LABELS',
        sourceColumns: ['phylum'],
        datasetLabel: 'phylum',
        options: GENERATORS.LABELS.defaultOptions(),
      }),
    });
    expect(out.content.startsWith('LABELS')).toBe(true);
    expect(out.content).toContain('A\tFirmicutes');
    expect(out.filename).toBe('labels_phylum.txt');
  });
});

describe('COLORSTRIP generator', () => {
  it('emits per-category color rows', () => {
    const out = GENERATORS.DATASET_COLORSTRIP.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_COLORSTRIP',
        sourceColumns: ['phylum'],
        datasetLabel: 'phylum',
        options: GENERATORS.DATASET_COLORSTRIP.defaultOptions(),
      }),
    });
    expect(out.content).toContain('DATASET_COLORSTRIP');
    expect(out.content).toContain('SEPARATOR TAB');
    expect(out.content).toContain('LEGEND_LABELS\tFirmicutes\tBacteroidota');
    // Same category gets same color.
    const lines = out.content.split('\n').filter((l) => l.startsWith('A\t') || l.startsWith('C\t'));
    const aColor = lines.find((l) => l.startsWith('A\t'))!.split('\t')[1];
    const cColor = lines.find((l) => l.startsWith('C\t'))!.split('\t')[1];
    expect(aColor).toBe(cColor);
  });

  it('honors per-category overrides', () => {
    const out = GENERATORS.DATASET_COLORSTRIP.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_COLORSTRIP',
        sourceColumns: ['phylum'],
        datasetLabel: 'phylum',
        options: GENERATORS.DATASET_COLORSTRIP.defaultOptions(),
        perCategory: { Firmicutes: { color: '#ff00ff', legendLabel: 'F-rep' } },
      }),
    });
    expect(out.content).toContain('A\t#ff00ff\tF-rep');
  });
});

describe('HEATMAP generator', () => {
  it('combines numeric columns', () => {
    const out = GENERATORS.DATASET_HEATMAP.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_HEATMAP',
        sourceColumns: ['completeness', 'contamination'],
        datasetLabel: 'qc',
        options: GENERATORS.DATASET_HEATMAP.defaultOptions(),
      }),
    });
    expect(out.content).toContain('DATASET_HEATMAP');
    expect(out.content).toContain('FIELD_LABELS\tcompleteness\tcontamination');
    expect(out.content).toContain('A\t95\t1');
  });
});

describe('BINARY generator', () => {
  it('encodes truthy/falsy values to 1/0', () => {
    const out = GENERATORS.DATASET_BINARY.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_BINARY',
        sourceColumns: ['present'],
        datasetLabel: 'present',
        options: GENERATORS.DATASET_BINARY.defaultOptions(),
      }),
    });
    expect(out.content).toContain('A\t1');
    expect(out.content).toContain('B\t0');
  });
});

describe('SIMPLEBAR generator', () => {
  it('emits one numeric value per id', () => {
    const out = GENERATORS.DATASET_SIMPLEBAR.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_SIMPLEBAR',
        sourceColumns: ['completeness'],
        datasetLabel: 'completeness',
        options: GENERATORS.DATASET_SIMPLEBAR.defaultOptions(),
      }),
    });
    expect(out.content).toContain('A\t95');
    expect(out.content).toContain('B\t88');
  });
});

describe('SYMBOL generator', () => {
  it('writes one symbol row per non-null id', () => {
    const out = GENERATORS.DATASET_SYMBOL.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_SYMBOL',
        sourceColumns: ['cohort'],
        datasetLabel: 'cohort',
        options: GENERATORS.DATASET_SYMBOL.defaultOptions(),
      }),
    });
    expect(out.content).toContain('DATASET_SYMBOL');
    expect(out.content.split('\n').filter((l) => l.startsWith('A\t')).length).toBe(1);
  });
});

describe('PIECHART generator', () => {
  it('emits one slice per source column', () => {
    const out = GENERATORS.DATASET_PIECHART.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_PIECHART',
        sourceColumns: ['completeness', 'contamination'],
        datasetLabel: 'qc',
        options: GENERATORS.DATASET_PIECHART.defaultOptions(),
      }),
    });
    expect(out.content).toContain('FIELD_LABELS\tcompleteness\tcontamination');
    expect(out.content).toContain('A\t-1');
  });
});

describe('TREE_COLORS generator', () => {
  it('writes label-scoped color rows by default', () => {
    const out = GENERATORS.TREE_COLORS.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'TREE_COLORS',
        sourceColumns: ['phylum'],
        datasetLabel: 'phylum',
        options: GENERATORS.TREE_COLORS.defaultOptions(),
      }),
    });
    expect(out.content).toContain('TREE_COLORS');
    expect(out.content.split('\n').some((l) => /^A\tlabel\t#/.test(l))).toBe(true);
  });
});

describe('GRADIENT generator', () => {
  it('emits a gradient file', () => {
    const out = GENERATORS.DATASET_GRADIENT.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_GRADIENT',
        sourceColumns: ['completeness'],
        datasetLabel: 'completeness',
        options: GENERATORS.DATASET_GRADIENT.defaultOptions(),
      }),
    });
    expect(out.content).toContain('DATASET_GRADIENT');
    expect(out.content).toContain('A\t95');
  });
});

describe('TEXT generator', () => {
  it('emits an iTOL DATASET_TEXT row per id', () => {
    const out = GENERATORS.DATASET_TEXT.generate({
      table: tbl,
      idColumn: 'id',
      columnSpecs: specMap,
      card: card({
        annotationType: 'DATASET_TEXT',
        sourceColumns: ['phylum'],
        datasetLabel: 'phylum',
        options: GENERATORS.DATASET_TEXT.defaultOptions(),
      }),
    });
    expect(out.content).toContain('DATASET_TEXT');
    expect(out.content.split('\n').some((l) => l.startsWith('A\tFirmicutes\t-1'))).toBe(true);
  });
});
