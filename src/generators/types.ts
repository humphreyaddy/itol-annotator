import type {
  AnnotationCard,
  ColumnSpec,
  GeneratedFile,
  ItolType,
  Table,
} from '../types';

export type GeneratorContext = {
  table: Table;
  idColumn: string;
  card: AnnotationCard;
  columnSpecs: Record<string, ColumnSpec>;
};

export type Generator = {
  /** iTOL type this generator handles. */
  type: ItolType;
  /** Default options for a freshly added card. */
  defaultOptions: () => Record<string, unknown>;
  /** Build the .txt file. */
  generate: (ctx: GeneratorContext) => GeneratedFile;
};
