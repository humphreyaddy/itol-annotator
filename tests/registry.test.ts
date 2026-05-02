import { describe, expect, it } from 'vitest';
import { ANNOTATION_COMPATIBILITY } from '../src/types';
import { GENERATORS, compatibleTypes } from '../src/generators';

describe('generator registry', () => {
  it('has a generator for every iTOL type listed in compatibility', () => {
    const referenced = new Set<string>();
    for (const list of Object.values(ANNOTATION_COMPATIBILITY)) {
      for (const t of list) referenced.add(t);
    }
    for (const t of referenced) {
      expect(GENERATORS[t as keyof typeof GENERATORS]).toBeDefined();
    }
  });
});

describe('compatibleTypes', () => {
  it('is dynamic w.r.t. column type', () => {
    const cat = compatibleTypes('categorical');
    const num = compatibleTypes('numeric');
    expect(cat).not.toEqual(num);
    expect(cat).toContain('DATASET_COLORSTRIP');
    expect(cat).not.toContain('DATASET_HEATMAP');
    expect(num).toContain('DATASET_HEATMAP');
    expect(num).not.toContain('DATASET_COLORSTRIP');
  });

  it('changing override would change the offered options', () => {
    const before = compatibleTypes('numeric');
    const after = compatibleTypes('categorical');
    expect(before.sort()).not.toEqual(after.sort());
  });
});

describe('metadata-agnostic guard', () => {
  it('source code does not embed the demo column name', async () => {
    // Phylum-related strings only appear in tests/docs; never in src/.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const root = path.resolve(__dirname, '..', 'src');
    const files = await collectTs(root);
    const banned = ['phylum', 'Bacteroidota', 'Firmicutes', 'malaria'];
    for (const f of files) {
      const content = await fs.readFile(f, 'utf8');
      for (const w of banned) {
        if (content.toLowerCase().includes(w.toLowerCase())) {
          throw new Error(`banned domain string "${w}" found in ${f}`);
        }
      }
    }
  });
});

async function collectTs(dir: string): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectTs(full)));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}
