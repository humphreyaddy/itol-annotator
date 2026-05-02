import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileJson, Plus, Save, ShieldCheck } from 'lucide-react';
import { parseFile } from './core/parse';
import { reportIdColumn } from './core/idColumn';
import { compareIds } from './core/newick';
import { parseTree, TREE_EXTENSIONS } from './core/tree';
import { bundleZip, downloadBlob, downloadText } from './core/zip';
import { useAppStore } from './store/useAppStore';
import { FileDropzone } from './components/FileDropzone';
import { ColumnProfile } from './components/ColumnProfile';
import { AnnotationCardView } from './components/AnnotationCard';
import { PreviewPane } from './components/PreviewPane';
import { TreeMatchPanel } from './components/TreeMatchPanel';

export default function App() {
  const store = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const handleMetadata = async (file: File) => {
    setError(null);
    try {
      const result = await parseFile(file);
      if (result.tables.length > 0 && result.tables[0].columns.length > 0) {
        store.setTables(result.tables, file.name);
      } else if (!result.bundledTree) {
        setError('No columns detected. Is the file empty or unsupported?');
        return;
      }
      // If the file also bundled a tree (e.g. .microreact), set it too.
      if (result.bundledTree) {
        store.setTree(result.bundledTree.text, `${file.name} → ${result.bundledTree.name}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleTree = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      store.setTree(text, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const idColumnOptions = store.table?.columns ?? [];
  const metaIds = useMemo(() => {
    if (!store.table || !store.idColumn) return [];
    return store.table.rows
      .map((r) => r[store.idColumn as string])
      .filter((v): v is string => Boolean(v && v.length > 0));
  }, [store.table, store.idColumn]);

  const idReport = useMemo(
    () => (store.table && store.idColumn ? reportIdColumn(store.table, store.idColumn) : null),
    [store.table, store.idColumn],
  );

  const treeParse = useMemo(() => {
    if (!store.treeNewick) return null;
    return parseTree(store.treeNewick);
  }, [store.treeNewick]);

  const treeMatch = useMemo(() => {
    if (!treeParse || metaIds.length === 0) return null;
    return compareIds(metaIds, treeParse.tipNames);
  }, [treeParse, metaIds]);

  const generated = useMemo(() => {
    if (!store.idColumn) return [];
    return store.generateAll();
  }, [store, store.cards, store.idColumn, store.table]);

  const downloadBlocked =
    !!treeMatch && treeMatch.matched.length === 0 && metaIds.length > 0;

  const downloadZip = async () => {
    if (generated.length === 0) return;
    const blob = await bundleZip(generated);
    downloadBlob(blob, 'itol_annotations.zip');
  };

  const exportConfig = () => {
    const cfg = store.exportConfig();
    downloadText(JSON.stringify(cfg, null, 2), 'itol_annotations_config.json');
  };

  const importConfig = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const cfg = JSON.parse(text);
      if (cfg.schemaVersion !== 1) throw new Error('Unsupported config schema version');
      store.importConfig(cfg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Header />
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Step 1: metadata */}
      <Section title="1. Metadata">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FileDropzone
            onFile={handleMetadata}
            accept=".csv,.tsv,.tab,.txt,.dat,.xlsx,.xls,.ods,.json,.geojson,.microreact"
            hint="CSV / TSV / TAB / TXT / DAT / XLSX / XLS / ODS / JSON / GeoJSON / .microreact. Parsed entirely in this browser tab."
            fileName={store.fileName}
          />
          <FileDropzone
            onFile={handleTree}
            accept={TREE_EXTENSIONS.join(',')}
            hint="(Optional) Newick / Nexus / PhyloXML / NeXML / NHX tree to validate IDs against."
            fileName={store.treeFileName}
          />
        </div>
        {store.sheets.length > 1 && (
          <div className="mt-3">
            <div className="label mb-1">Sheet</div>
            <select
              className="select max-w-xs"
              value={store.activeSheet}
              onChange={(e) => store.setActiveSheet(Number(e.target.value))}
            >
              {store.sheets.map((s, i) => (
                <option key={s.sheetName ?? i} value={i}>
                  {s.sheetName ?? `sheet ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </Section>

      {/* Step 2: ID column */}
      {store.table && (
        <Section title="2. Pick the ID column">
          <p className="mb-2 text-sm text-ink-600">
            Choose the column whose values match the tip names in your tree. Everything
            else becomes a candidate variable for annotation. The app auto-picked one
            based on the column names — change it if it guessed wrong.
          </p>
          <select
            className="select max-w-md"
            value={store.idColumn ?? ''}
            onChange={(e) => store.setIdColumn(e.target.value || null)}
            aria-describedby="id-validation"
          >
            <option value="">— select ID column —</option>
            {idColumnOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div id="id-validation" className="mt-2">
            <IdColumnValidation
              report={idReport}
              treeMatched={treeMatch?.matched.length ?? null}
              treeTotal={metaIds.length}
            />
          </div>
        </Section>
      )}

      {/* Step 3+4: column profile + variable selection */}
      {store.table && store.idColumn && (
        <Section
          title="3. Variables & datatypes"
          right={
            <span className="text-xs text-ink-500">
              {store.selectedColumns.size} of {store.columnSpecs.length} selected
            </span>
          }
        >
          <ColumnProfile
            specs={store.columnSpecs}
            selected={store.selectedColumns}
            onToggle={(c) => store.toggleSelected(c)}
            onOverride={(c, t) => store.overrideType(c, t)}
          />
        </Section>
      )}

      {/* Step 5: configure each card */}
      {store.cards.length > 0 && (
        <Section title="4. Configure annotations">
          <div className="space-y-3">
            {store.cards.map((card) => (
              <AnnotationCardView
                key={card.id}
                card={card}
                specs={store.columnSpecs}
                onChange={(p) => store.updateCard(card.id, p)}
                onChangeType={(t) => store.changeCardType(card.id, t)}
                onRemove={() => store.removeCard(card.id)}
              />
            ))}
            {store.selectedColumns.size > 0 && (
              <AddAnotherCard />
            )}
          </div>
        </Section>
      )}

      {/* Step 6: tree validation */}
      {store.table && store.idColumn && (
        <Section title="5. Validate against tree (optional)">
          <TreeMatchPanel metaIds={metaIds} newick={store.treeNewick} />
        </Section>
      )}

      {/* Step 7+8: preview + download */}
      {store.cards.length > 0 && (
        <Section
          title="6. Preview & download"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn" onClick={exportConfig}>
                <Save className="h-4 w-4" /> Save config
              </button>
              <label className="btn cursor-pointer">
                <FileJson className="h-4 w-4" /> Load config
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importConfig(f);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <button
                className="btn-primary"
                onClick={downloadZip}
                disabled={generated.length === 0 || downloadBlocked}
              >
                <Download className="h-4 w-4" /> Download all (.zip)
              </button>
            </div>
          }
        >
          {downloadBlocked && (
            <div role="alert" className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              <strong>None of your metadata IDs match the tree.</strong> iTOL will reject
              these files. Common cause: the wrong column is selected as the ID column —
              go back to step 2 and pick the column whose values are sample / tip names
              (e.g. <code>SAMPLE_001</code>), not a category like <code>sex</code> or
              <code>group</code>.
            </div>
          )}
          <PreviewPane files={generated} />
        </Section>
      )}

      <Footer />
    </div>
  );
}

function AddAnotherCard() {
  const store = useAppStore();
  const [col, setCol] = useState<string>('');
  const eligible = Array.from(store.selectedColumns);
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-ink-200 p-3 text-sm">
      <Plus className="h-4 w-4 text-ink-500" />
      <span className="text-ink-600">Add another annotation for column:</span>
      <select className="select max-w-xs" value={col} onChange={(e) => setCol(e.target.value)}>
        <option value="">— pick column —</option>
        {eligible.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        className="btn"
        disabled={!col}
        onClick={() => {
          if (col) {
            store.addCardForColumn(col);
            setCol('');
          }
        }}
      >
        Add
      </button>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">iTOL annotation generator</h1>
        <p className="text-sm text-ink-500">
          Drop your metadata, pick what to annotate, download iTOL-ready files.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="pill bg-emerald-100 text-emerald-800">
          <ShieldCheck className="mr-1 h-3 w-3" /> runs in your browser
        </span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="pt-4 text-xs text-ink-500">
      <p>
        No data leaves your machine. The page never makes a network request after it loads.
      </p>
    </footer>
  );
}

function IdColumnValidation({
  report,
  treeMatched,
  treeTotal,
}: {
  report: ReturnType<typeof reportIdColumn>;
  treeMatched: number | null;
  treeTotal: number;
}) {
  if (!report) return null;
  const dupCount = report.duplicates.length;
  const hasDupes = dupCount > 0;
  const hasEmpties = report.empties > 0;
  const treeFraction =
    treeMatched === null || treeTotal === 0 ? null : treeMatched / treeTotal;
  const treeBad = treeFraction !== null && treeFraction === 0;
  const treeWarn = treeFraction !== null && treeFraction > 0 && treeFraction < 0.5;

  if (!hasDupes && !hasEmpties && (treeFraction === null || treeFraction === 1)) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {report.uniqueCount} unique IDs detected
          {treeFraction === 1 && treeMatched !== null && (
            <> · {treeMatched}/{treeTotal} match the tree</>
          )}
          .
        </span>
      </div>
    );
  }

  return (
    <div
      className={[
        'rounded-md border px-3 py-2 text-sm',
        treeBad || hasDupes
          ? 'border-red-300 bg-red-50 text-red-900'
          : 'border-amber-300 bg-amber-50 text-amber-900',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          {treeBad && (
            <div>
              <strong>0 of {treeTotal} metadata IDs match the tree.</strong> You probably
              picked the wrong column as the ID. Pick the column whose values are tip
              names (e.g. <code>SAMPLE_001</code>), not a category like <code>sex</code>.
            </div>
          )}
          {treeWarn && (
            <div>
              Only {treeMatched} of {treeTotal} metadata IDs match the tree
              ({Math.round(treeFraction! * 100)}%). Double-check the ID column choice.
            </div>
          )}
          {hasDupes && (
            <div>
              <strong>This column has {dupCount} duplicated value(s)</strong>
              {dupCount <= 5 && <>: <code>{report.duplicates.join(', ')}</code></>}.
              An ID column should have one row per tip — this is unlikely to be
              correct.
            </div>
          )}
          {hasEmpties && !treeBad && (
            <div>{report.empties} row(s) have an empty ID and will be skipped.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
        {right}
      </div>
      <div>{children}</div>
    </section>
  );
}

