import JSZip from 'jszip';
import type { GeneratedFile } from '../types';

export async function bundleZip(files: GeneratedFile[]): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.filename, f.content);
  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(content: string, name: string): void {
  downloadBlob(new Blob([content], { type: 'text/plain' }), name);
}
