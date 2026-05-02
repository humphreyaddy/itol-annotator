import { create } from 'zustand';
import type {
  AnnotationCard,
  ColumnSpec,
  ColumnType,
  GeneratedFile,
  ItolType,
  SavedConfig,
  Table,
} from '../types';
import { applyOverride, profileTable } from '../core/infer';
import { guessIdColumn } from '../core/idColumn';
import { GENERATORS } from '../generators';

type State = {
  table: Table | null;
  fileName: string | null;
  /** Available sheet tables when an XLSX file produced multiple sheets. */
  sheets: Table[];
  activeSheet: number;

  idColumn: string | null;
  columnSpecs: ColumnSpec[];
  selectedColumns: Set<string>;

  cards: AnnotationCard[];

  treeNewick: string | null;
  treeFileName: string | null;

  // setters
  setTables: (sheets: Table[], fileName: string) => void;
  setActiveSheet: (i: number) => void;
  setIdColumn: (col: string | null) => void;
  overrideType: (col: string, t?: ColumnType) => void;
  toggleSelected: (col: string) => void;
  addCardForColumn: (col: string) => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, patch: Partial<AnnotationCard>) => void;
  changeCardType: (id: string, type: ItolType) => void;
  setTree: (newick: string | null, fileName?: string | null) => void;

  reset: () => void;
  exportConfig: () => SavedConfig;
  importConfig: (cfg: SavedConfig) => void;
  generateAll: () => GeneratedFile[];
};

const initial = {
  table: null,
  fileName: null,
  sheets: [],
  activeSheet: 0,
  idColumn: null,
  columnSpecs: [] as ColumnSpec[],
  selectedColumns: new Set<string>(),
  cards: [] as AnnotationCard[],
  treeNewick: null,
  treeFileName: null,
};

export const useAppStore = create<State>((set, get) => ({
  ...initial,

  setTables: (sheets, fileName) => {
    const active = sheets[0] ?? null;
    const guessed = active ? guessIdColumn(active) : null;
    set({
      sheets,
      activeSheet: 0,
      table: active,
      fileName,
      idColumn: guessed,
      columnSpecs: active ? profileTable(active, guessed) : [],
      selectedColumns: new Set(),
      cards: [],
    });
  },

  setActiveSheet: (i) => {
    const { sheets } = get();
    const t = sheets[i];
    if (!t) return;
    const guessed = guessIdColumn(t);
    set({
      activeSheet: i,
      table: t,
      idColumn: guessed,
      columnSpecs: profileTable(t, guessed),
      selectedColumns: new Set(),
      cards: [],
    });
  },

  setIdColumn: (col) => {
    const { table } = get();
    if (!table) return;
    set({
      idColumn: col,
      columnSpecs: profileTable(table, col),
      selectedColumns: new Set(),
      cards: [],
    });
  },

  overrideType: (col, t) => {
    set((s) => ({
      columnSpecs: s.columnSpecs.map((c) =>
        c.name === col ? applyOverride(c, t) : c,
      ),
      cards: s.cards.map((card) => {
        // If card's source column was re-typed and current annotation type is
        // no longer compatible, drop the type so the dropdown reopens.
        if (!card.sourceColumns.includes(col)) return card;
        return card;
      }),
    }));
  },

  toggleSelected: (col) => {
    set((s) => {
      const next = new Set(s.selectedColumns);
      if (next.has(col)) {
        next.delete(col);
        return {
          selectedColumns: next,
          cards: s.cards.filter((c) => !c.sourceColumns.includes(col)),
        };
      }
      next.add(col);
      const cards = [...s.cards, makeDefaultCard(col, s.columnSpecs)];
      return { selectedColumns: next, cards };
    });
  },

  addCardForColumn: (col) => {
    set((s) => ({ cards: [...s.cards, makeDefaultCard(col, s.columnSpecs)] }));
  },

  removeCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

  updateCard: (id, patch) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  changeCardType: (id, type) =>
    set((s) => ({
      cards: s.cards.map((c) =>
        c.id === id
          ? {
              ...c,
              annotationType: type,
              options: GENERATORS[type].defaultOptions(),
              perCategory: undefined,
            }
          : c,
      ),
    })),

  setTree: (newick, fileName) => set({ treeNewick: newick, treeFileName: fileName ?? null }),

  reset: () => set(initial),

  exportConfig: () => {
    const { idColumn, cards } = get();
    return { schemaVersion: 1, idColumn, cards, generatedAt: new Date().toISOString() };
  },

  importConfig: (cfg) => set({ idColumn: cfg.idColumn, cards: cfg.cards }),

  generateAll: () => {
    const { table, idColumn, cards, columnSpecs } = get();
    if (!table || !idColumn) return [];
    const specMap: Record<string, ColumnSpec> = Object.fromEntries(
      columnSpecs.map((c) => [c.name, c]),
    );
    const out: GeneratedFile[] = [];
    for (const card of cards) {
      const gen = GENERATORS[card.annotationType];
      if (!gen) continue;
      try {
        out.push(gen.generate({ table, idColumn, card, columnSpecs: specMap }));
      } catch (err) {
        console.error('Generator error for', card.annotationType, err);
      }
    }
    return out;
  },
}));

function makeDefaultCard(col: string, specs: ColumnSpec[]): AnnotationCard {
  const spec = specs.find((s) => s.name === col);
  const t = pickDefaultType(spec?.effectiveType ?? 'text');
  return {
    id: cryptoRandomId(),
    sourceColumns: [col],
    annotationType: t,
    datasetLabel: col,
    options: GENERATORS[t].defaultOptions() as never,
  };
}

function pickDefaultType(effective: ColumnType): ItolType {
  switch (effective) {
    case 'categorical':
      return 'DATASET_COLORSTRIP';
    case 'numeric':
      return 'DATASET_GRADIENT';
    case 'binary':
      return 'DATASET_BINARY';
    case 'text':
      return 'LABELS';
  }
}

function cryptoRandomId(): string {
  // Browsers: use crypto.randomUUID when available; fallback otherwise.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'card_' + Math.random().toString(36).slice(2, 10);
}
