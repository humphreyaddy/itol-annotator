import { Download } from 'lucide-react';
import type { GeneratedFile } from '../types';
import { downloadText } from '../core/zip';

export function PreviewPane({ files }: { files: GeneratedFile[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
        Configure at least one annotation card above to see a preview here.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {files.map((f) => (
        <div key={f.cardId + f.filename} className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span className="pill bg-ink-100 text-ink-700">{f.annotationType}</span>
              <code className="text-xs text-ink-700">{f.filename}</code>
            </div>
            <button
              className="btn"
              onClick={() => downloadText(f.content, f.filename)}
              aria-label={`Download ${f.filename}`}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
          <pre className="preview max-h-72 overflow-auto bg-ink-50 px-4 py-3 text-ink-700">
            {f.content}
          </pre>
        </div>
      ))}
    </div>
  );
}
