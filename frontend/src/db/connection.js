import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const dbPath = resolve(
  resolve(),
  '../gcss-mc',
  'hackathon_data.sqlite3'
);
console.log(dbPath);

export function getDb() {
  return new DatabaseSync(dbPath);
}
