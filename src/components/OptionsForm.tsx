import type {
  AnnotationCard,
  BinaryOptions,
  ColorstripOptions,
  GradientOptions,
  HeatmapOptions,
  ItolType,
  LabelsOptions,
  PiechartOptions,
  SimpleBarOptions,
  SymbolOptions,
  TextOptions,
  TreeColorsOptions,
} from '../types';
import { EyeDropperButton } from './EyeDropperButton';

type Props = {
  card: AnnotationCard;
  paletteNames: string[];
  scaleNames: string[];
  onChange: (opts: AnnotationCard['options']) => void;
};

export function OptionsForm({ card, paletteNames, scaleNames, onChange }: Props) {
  const t: ItolType = card.annotationType;
  if (t === 'DATASET_COLORSTRIP') {
    const o = card.options as ColorstripOptions;
    return (
      <Grid>
        <PaletteField value={o.palette} options={paletteNames} onChange={(v) => onChange({ ...o, palette: v })} />
        <NumberField label="Strip width" value={o.stripWidth} onChange={(v) => onChange({ ...o, stripWidth: v })} />
        <NumberField label="Border width" value={o.borderWidth} step={0.1} onChange={(v) => onChange({ ...o, borderWidth: v })} />
        <ColorField label="Border color" value={o.borderColor} onChange={(v) => onChange({ ...o, borderColor: v })} />
        <ToggleField label="Show internal" checked={o.showInternal} onChange={(v) => onChange({ ...o, showInternal: v })} />
        <ToggleField label="Color branches too" checked={o.colorBranches} onChange={(v) => onChange({ ...o, colorBranches: v })} />
      </Grid>
    );
  }
  if (t === 'TREE_COLORS') {
    const o = card.options as TreeColorsOptions;
    return (
      <Grid>
        <PaletteField value={o.palette} options={paletteNames} onChange={(v) => onChange({ ...o, palette: v })} />
        <SelectField
          label="Default scope"
          value={o.defaultScope}
          options={['label', 'branch', 'clade', 'range']}
          onChange={(v) => onChange({ ...o, defaultScope: v as TreeColorsOptions['defaultScope'] })}
        />
        <SelectField
          label="Default style"
          value={o.defaultStyle}
          options={['normal', 'dashed', 'dotted']}
          onChange={(v) => onChange({ ...o, defaultStyle: v as TreeColorsOptions['defaultStyle'] })}
        />
        <NumberField label="Default width" value={o.defaultWidth} onChange={(v) => onChange({ ...o, defaultWidth: v })} />
      </Grid>
    );
  }
  if (t === 'DATASET_BINARY') {
    const o = card.options as BinaryOptions;
    return (
      <Grid>
        <SelectField
          label="Default shape"
          value={String(o.defaultShape)}
          options={['1', '2', '3', '4', '5', '6']}
          labels={['square', 'circle', 'star', 'right-tri', 'left-tri', 'checkmark']}
          onChange={(v) => onChange({ ...o, defaultShape: Number(v) })}
        />
        <ColorField label="Fill color" value={o.fillColor} onChange={(v) => onChange({ ...o, fillColor: v })} />
        <NumberField label="Height factor" value={o.heightFactor} step={0.1} onChange={(v) => onChange({ ...o, heightFactor: v })} />
      </Grid>
    );
  }
  if (t === 'DATASET_HEATMAP') {
    const o = card.options as HeatmapOptions;
    return (
      <Grid>
        <SelectField
          label="Color scale"
          value={o.scale}
          options={[...scaleNames, 'custom']}
          onChange={(v) => onChange({ ...o, scale: v })}
        />
        {o.scale === 'custom' && (
          <>
            <ColorField label="Custom min" value={o.customMin ?? '#053061'} onChange={(v) => onChange({ ...o, customMin: v })} />
            <ColorField label="Custom mid" value={o.customMid ?? '#f7f7f7'} onChange={(v) => onChange({ ...o, customMid: v })} />
            <ColorField label="Custom max" value={o.customMax ?? '#67001f'} onChange={(v) => onChange({ ...o, customMax: v })} />
          </>
        )}
        <ToggleField label="Use mid color" checked={o.useMid} onChange={(v) => onChange({ ...o, useMid: v })} />
        <ToggleField label="Auto range" checked={o.autoRange} onChange={(v) => onChange({ ...o, autoRange: v })} />
        {!o.autoRange && (
          <>
            <NumberField label="Manual min" value={o.manualMin ?? 0} onChange={(v) => onChange({ ...o, manualMin: v })} />
            <NumberField label="Manual mid" value={o.manualMid ?? 0.5} onChange={(v) => onChange({ ...o, manualMid: v })} />
            <NumberField label="Manual max" value={o.manualMax ?? 1} onChange={(v) => onChange({ ...o, manualMax: v })} />
          </>
        )}
        <NumberField label="Strip width" value={o.stripWidth} onChange={(v) => onChange({ ...o, stripWidth: v })} />
        <SelectField
          label="Normalization"
          value={o.normalization}
          options={['none', 'zscore', 'log10', 'minmax']}
          onChange={(v) => onChange({ ...o, normalization: v as HeatmapOptions['normalization'] })}
        />
      </Grid>
    );
  }
  if (t === 'DATASET_SIMPLEBAR') {
    const o = card.options as SimpleBarOptions;
    return (
      <Grid>
        <ColorField label="Bar color" value={o.color} onChange={(v) => onChange({ ...o, color: v })} />
        <NumberField label="Width" value={o.width} onChange={(v) => onChange({ ...o, width: v })} />
        <SelectField
          label="Scale"
          value={o.scale}
          options={['linear', 'log']}
          onChange={(v) => onChange({ ...o, scale: v as SimpleBarOptions['scale'] })}
        />
      </Grid>
    );
  }
  if (t === 'DATASET_GRADIENT') {
    const o = card.options as GradientOptions;
    return (
      <Grid>
        <SelectField label="Color scale" value={o.scale} options={scaleNames} onChange={(v) => onChange({ ...o, scale: v })} />
        <ToggleField label="Use mid color" checked={o.useMid} onChange={(v) => onChange({ ...o, useMid: v })} />
        <NumberField label="Strip width" value={o.stripWidth} onChange={(v) => onChange({ ...o, stripWidth: v })} />
      </Grid>
    );
  }
  if (t === 'DATASET_TEXT') {
    const o = card.options as TextOptions;
    return (
      <Grid>
        <NumberField label="Font size" value={o.fontSize} step={0.1} onChange={(v) => onChange({ ...o, fontSize: v })} />
        <ColorField label="Font color" value={o.fontColor} onChange={(v) => onChange({ ...o, fontColor: v })} />
        <ToggleField label="Bold" checked={o.bold} onChange={(v) => onChange({ ...o, bold: v })} />
        <ToggleField label="Italic" checked={o.italic} onChange={(v) => onChange({ ...o, italic: v })} />
        <NumberField label="Rotation (deg)" value={o.rotation} onChange={(v) => onChange({ ...o, rotation: v })} />
      </Grid>
    );
  }
  if (t === 'DATASET_PIECHART') {
    const o = card.options as PiechartOptions;
    return (
      <Grid>
        <PaletteField value={o.palette} options={paletteNames} onChange={(v) => onChange({ ...o, palette: v })} />
        <NumberField label="Radius" value={o.radius} onChange={(v) => onChange({ ...o, radius: v })} />
        <ToggleField label="Scale by total" checked={o.scaleByTotal} onChange={(v) => onChange({ ...o, scaleByTotal: v })} />
        <ColorField label="Border color" value={o.borderColor} onChange={(v) => onChange({ ...o, borderColor: v })} />
        <NumberField label="Border width" value={o.borderWidth} step={0.1} onChange={(v) => onChange({ ...o, borderWidth: v })} />
      </Grid>
    );
  }
  if (t === 'DATASET_SYMBOL') {
    const o = card.options as SymbolOptions;
    return (
      <Grid>
        <PaletteField value={o.palette} options={paletteNames} onChange={(v) => onChange({ ...o, palette: v })} />
        <SelectField
          label="Default shape"
          value={String(o.defaultShape)}
          options={['1', '2', '3', '4', '5', '6']}
          labels={['square', 'circle', 'star', 'right-tri', 'left-tri', 'checkmark']}
          onChange={(v) => onChange({ ...o, defaultShape: Number(v) })}
        />
        <NumberField label="Size" value={o.defaultSize} onChange={(v) => onChange({ ...o, defaultSize: v })} />
        <NumberField label="Position on branch (0-1)" value={o.positionOnBranch} step={0.1} onChange={(v) => onChange({ ...o, positionOnBranch: v })} />
        <ToggleField label="Filled" checked={o.filled} onChange={(v) => onChange({ ...o, filled: v })} />
      </Grid>
    );
  }
  if (t === 'LABELS') {
    const o = card.options as LabelsOptions;
    return (
      <Grid>
        <TextField label="Prefix" value={o.prefix} onChange={(v) => onChange({ ...o, prefix: v })} />
        <TextField label="Suffix" value={o.suffix} onChange={(v) => onChange({ ...o, suffix: v })} />
        <NumberField label="Truncate to N chars (0=off)" value={o.truncate} onChange={(v) => onChange({ ...o, truncate: v })} />
      </Grid>
    );
  }
  return null;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <input
        type="number"
        step={step ?? 1}
        className="input"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded border border-ink-200 bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input className="input flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
        <EyeDropperButton onPick={onChange} ariaLabel={`Pick ${label} from screen`} />
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 pt-5">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-ink-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o, i) => (
          <option key={o} value={o}>
            {labels?.[i] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PaletteField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return <SelectField label="Palette" value={value} options={options} onChange={onChange} />;
}
