import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Single shared database file. Change the filename if you ever want to
// separate a "dev" database from a "real" one.
const db = new Database(join(__dirname, 'digi-office.db'));

// Load and run the schema every time the app starts.
// CREATE TABLE IF NOT EXISTS makes this safe to run repeatedly —
// it won't wipe existing data.
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;