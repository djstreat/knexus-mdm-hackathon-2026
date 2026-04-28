import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readv(name) {
  const filename = resolve(
    resolve(),
    '../gcss-mc',
    name
  );

  const content = readFileSync(filename, 'utf-8')
    .split('\n')
    .filter(x => !!x)
    .map(x=>x.trim())
    .slice(1);
  return content;
}


class minimap {
  constructor(labels) {
    this.labels = labels;
    this._map = new Map();
    this._count = 0;
  }

  get(id) {
    if (!this._map.has(id)) {
      const ii = (++this._count) % this.labels.length;
      this._map.set(id, this.labels[ii]);
    }

    return this._map.get(id);
  }
}

export const RNSN_LABELS = new minimap(readv('rnsn_labels.csv'));
export const TAMCN_LABELS = new minimap(readv('tamcn_labels.csv'));
