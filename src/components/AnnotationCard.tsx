import { Trash2 } from 'lucide-react';
import type {
  AnnotationCard as Card,
  ColumnSpec,
  ItolType,
  PerCategory,
} from '../types';
import { compatibleTypes, GENERATORS, TYPE_DISPLAY } from '../generators';
import { assignColors, HEATMAP_SCALE_NAMES, PALETTE_NAMES } from '../core/palettes';
import { OptionsForm } from './OptionsForm';

type Props = {
  card: Card;
  specs: ColumnSpec[];
  onChange: (patch: Partial<Card>) => void;
  onChangeType: (t: ItolType) => void;
  onRemove: () => void;
};

export function AnnotationCardView({ card, specs, onChange, onChangeType, onRemove }: Props) {
  const primaryCol = card.sourceColumns[0];
  const spec = specs.find((s) => s.name === primaryCol);
  const allowedTypes: ItolType[] = spec ? compatibleTypes(spec.effectiveType) : [];

  const handlePerCategory = (
    value: string,
    patch: Partial<PerCategory>,
  ) => {
    const next = { ...(card.perCategory ?? {}) };
    const existing: PerCategory = next[value] ?? { color: '#888888' };
    next[value] = { ...existing, ...patch };
    onChange({ perCategory: next });
  };

  const ensureCompatibleType = (t: ItolType) => {
    if (allowedTypes.includes(t)) return t;
    return allowedTypes[0] ?? card.annotationType;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <span className="pill bg-ink-100 text-ink-700">{primaryCol}</span>
          <span className="text-xs text-ink-500">{spec?.effectiveType}</span>
        </div>
        <button onClick={onRemove} className="text-ink-500 hover:text-ink-800" aria-label="Remove card">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="label mb-1">Annotation type</div>
            <select
              className="select"
              value={card.annotationType}
              onChange={(e) => {
                const t = ensureCompatibleType(e.target.value as ItolType);
                onChangeType(t);
              }}
            >
              {allowedTypes.map((t) => (
                <option key={t} value={t}>
                  {TYPE_DISPLAY[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Dataset label</div>
            <input
              className="input"
              value={card.datasetLabel}
              onChange={(e) => onChange({ datasetLabel: e.target.value })}
            />
          </div>
        </div>

        {/* Multi-column picker for HEATMAP / PIECHART / BINARY */}
        {(card.annotationType === 'DATASET_HEATMAP' ||
          card.annotationType === 'DATASET_PIECHART' ||
          card.annotationType === 'DATASET_BINARY') && (
          <MultiColumnPicker
            allColumns={specs}
            selectedColumns={card.sourceColumns}
            requiredType={
              card.annotationType === 'DATASET_BINARY' ? 'binary' : 'numeric'
            }
            onChange={(cols) => onChange({ sourceColumns: cols })}
          />
        )}

        <OptionsForm
          card={card}
          paletteNames={PALETTE_NAMES}
          scaleNames={HEATMAP_SCALE_NAMES}
          onChange={(opts) => onChange({ options: opts })}
        />

        {/* Per-category controls for categorical-driven types. */}
        {(card.annotationType === 'DATASET_COLORSTRIP' ||
          card.annotationType === 'TREE_COLORS' ||
          card.annotationType === 'DATASET_SYMBOL') &&
          spec && (
            <PerCategoryEditor
              card={card}
              uniqueValues={spec.uniqueValues}
              palette={(card.options as { palette?: string }).palette ?? 'Set1'}
              showShape={card.annotationType === 'DATASET_SYMBOL'}
              showScope={card.annotationType === 'TREE_COLORS'}
              onUpdate={handlePerCategory}
            />
          )}
      </div>
    </div>
  );
}

function MultiColumnPicker({
  allColumns,
  selectedColumns,
  requiredType,
  onChange,
}: {
  allColumns: ColumnSpec[];
  selectedColumns: string[];
  requiredType: 'numeric' | 'binary';
  onChange: (cols: string[]) => void;
}) {
  const compatible = allColumns.filter((c) => c.effectiveType === requiredType);
  return (
    <div>
      <div className="label mb-1">Columns to include ({requiredType})</div>
      <div className="flex flex-wrap gap-2">
        {compatible.map((c) => {
          const selected = selectedColumns.includes(c.name);
          return (
            <button
              key={c.name}
              type="button"
              className={[
                'rounded-md border px-2 py-1 text-xs transition-colors',
                selected
                  ? 'border-ink-700 bg-ink-800 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
              ].join(' ')}
              onClick={() => {
                if (selected) onChange(selectedColumns.filter((n) => n !== c.name));
                else onChange([...selectedColumns, c.name]);
              }}
            >
              {c.name}
            </button>
          );
        })}
        {compatible.length === 0 && (
          <span className="text-xs text-ink-500">
            No {requiredType} columns detected. Override a column's datatype above to include it.
          </span>
        )}
      </div>
    </div>
  );
}

function PerCategoryEditor({
  card,
  uniqueValues,
  palette,
  showShape,
  showScope,
  onUpdate,
}: {
  card: Card;
  uniqueValues: string[];
  palette: string;
  showShape: boolean;
  showScope: boolean;
  onUpdate: (value: string, patch: Partial<PerCategory>) => void;
}) {
  if (uniqueValues.length === 0) return null;
  const auto = assignColors(uniqueValues, palette);
  return (
    <div>
      <div className="label mb-1">Per-category controls</div>
      <div className="rounded-md border border-ink-200 divide-y">
        {uniqueValues.map((v) => {
          const pc = card.perCategory?.[v];
          const color = pc?.color ?? auto[v];
          const label = pc?.legendLabel ?? v;
          return (
            <div key={v} className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-xs">
              <div className="col-span-3 font-medium text-ink-700 truncate" title={v}>
                {v}
              </div>
              <input
                type="color"
                className="col-span-1 h-6 w-full cursor-pointer rounded border border-ink-200 bg-white"
                value={color}
                onChange={(e) => onUpdate(v, { color: e.target.value })}
                aria-label={`Color for ${v}`}
              />
              <input
                className="input col-span-3 text-xs"
                placeholder="legend label"
                value={label}
                onChange={(e) => onUpdate(v, { legendLabel: e.target.value })}
              />
              {showShape && (
                <select
                  className="select col-span-2 text-xs"
                  value={pc?.shape ?? 2}
                  onChange={(e) => onUpdate(v, { shape: Number(e.target.value) })}
                  aria-label={`Shape for ${v}`}
                >
                  <option value={1}>square</option>
                  <option value={2}>circle</option>
                  <option value={3}>star</option>
                  <option value={4}>right-tri</option>
                  <option value={5}>left-tri</option>
                  <option value={6}>checkmark</option>
                </select>
              )}
              {showScope && (
                <>
                  <select
                    className="select col-span-2 text-xs"
                    value={pc?.scope ?? 'label'}
                    onChange={(e) =>
                      onUpdate(v, { scope: e.target.value as PerCategory['scope'] })
                    }
                    aria-label={`Scope for ${v}`}
                  >
                    <option value="label">label</option>
                    <option value="branch">branch</option>
                    <option value="clade">clade</option>
                    <option value="range">range</option>
                  </select>
                  <select
                    className="select col-span-2 text-xs"
                    value={pc?.style ?? 'normal'}
                    onChange={(e) =>
                      onUpdate(v, { style: e.target.value as PerCategory['style'] })
                    }
                    aria-label={`Style for ${v}`}
                  >
                    <option value="normal">normal</option>
                    <option value="dashed">dashed</option>
                    <option value="dotted">dotted</option>
                  </select>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Re-export so the App can import the registry from one place.
export { GENERATORS };
