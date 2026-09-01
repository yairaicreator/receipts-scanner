// Shared expense store.
//
// Every device that opens the site talks to this one store, so a person's
// receipts accumulate in a single growing record no matter who scanned them
// or on which phone — the thing the prototype could only do per-browser with
// localStorage.
//
// Backed by Postgres when DATABASE_URL is set (Vercel Postgres, Neon,
// Supabase, plain Postgres — any of them supply that variable). Without it,
// falls back to a JSON file under .data/ so `npm run dev` works with no
// database. The file fallback is DEV ONLY: serverless filesystems are
// ephemeral and per-instance, so a deployment without DATABASE_URL would
// silently lose data — and on Vercel specifically, `process.cwd()` isn't
// even writable (only /tmp is), so the fallback doesn't degrade quietly
// there, it throws on the first save. See `unconfiguredStore` below.

import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeName } from '../../shared/categories.js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
export const usingDatabase = Boolean(DATABASE_URL);

const FILE_PATH = path.join(process.cwd(), '.data', 'expenses.json');

// Vercel sets this in every deployment, preview or production — it's how we
// tell "no DATABASE_URL because this is someone's local checkout" (fine, use
// the file) apart from "no DATABASE_URL on a real deployment" (not fine,
// there is nowhere durable to write; say so instead of failing confusingly).
const isServerless = Boolean(process.env.VERCEL);

/* ── Postgres ──────────────────────────────────────────────────────────── */

let poolPromise = null;
let schemaReady = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = import('pg').then(({ default: pg }) => {
      return new pg.Pool({
        connectionString: DATABASE_URL,
        // Hosted Postgres (Neon/Supabase/Vercel) terminates TLS with a cert
        // chain node doesn't ship; every one of them documents this flag.
        ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
        max: 3,
      });
    });
  }
  return poolPromise;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = await getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS people (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          name_key    TEXT NOT NULL UNIQUE,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS expenses (
          id          TEXT PRIMARY KEY,
          person_id   TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
          date        DATE NOT NULL,
          category    TEXT NOT NULL,
          amount      NUMERIC(12,2) NOT NULL,
          vendor      TEXT NOT NULL DEFAULT '—',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS expenses_person_idx ON expenses (person_id);
        -- Added after the first deployment — IF NOT EXISTS so this stays
        -- safe to run against a database that already has the table.
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
      `);
    })().catch((err) => {
      schemaReady = null; // let the next request retry a transient failure
      throw err;
    });
  }
  return schemaReady;
}

function rowsToPeople(peopleRows, expenseRows) {
  const byId = new Map(
    peopleRows.map((p) => [p.id, { id: p.id, name: p.name, expenses: [] }]),
  );
  for (const e of expenseRows) {
    const person = byId.get(e.person_id);
    if (!person) continue;
    person.expenses.push({
      id: e.id,
      // node-postgres hands back a Date for DATE columns; the app speaks
      // YYYY-MM-DD everywhere (form value, sort key, sheet cell).
      date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date),
      category: e.category,
      amount: Number(e.amount),
      vendor: e.vendor,
      // Not shown in the app — kept only because it's what the AI used to
      // pick the category, in case that reasoning is worth surfacing later.
      subject: e.subject || '',
    });
  }
  return [...byId.values()];
}

// Insert-or-get in one statement so two phones settling on the same new name
// at the same moment can't create two people records. `client` is either the
// pool directly (a standalone join) or a connection already inside a
// transaction (a join folded into a save).
async function upsertPersonRow(client, personName) {
  const key = normalizeName(personName);
  const upsert = await client.query(
    `INSERT INTO people (id, name, name_key) VALUES ($1, $2, $3)
     ON CONFLICT (name_key) DO UPDATE SET name = people.name
     RETURNING id`,
    [newId(), personName.trim(), key],
  );
  return upsert.rows[0].id;
}

const dbStore = {
  async listPeople() {
    await ensureSchema();
    const pool = await getPool();
    const [people, expenses] = await Promise.all([
      pool.query('SELECT id, name FROM people ORDER BY created_at ASC'),
      pool.query('SELECT id, person_id, date, category, amount, vendor, subject FROM expenses ORDER BY date ASC, created_at ASC'),
    ]);
    return rowsToPeople(people.rows, expenses.rows);
  },

  async addExpense({ personName, expense }) {
    await ensureSchema();
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const personId = await upsertPersonRow(client, personName);
      await client.query(
        `INSERT INTO expenses (id, person_id, date, category, amount, vendor, subject)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [expense.id, personId, expense.date, expense.category, expense.amount, expense.vendor, expense.subject || ''],
      );
      await client.query('COMMIT');
      return personId;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  // Registers a person the moment they join, with no receipt yet — so the
  // staff list shows everyone who's signed up, not just whoever happens to
  // have scanned something first.
  async addPerson(personName) {
    await ensureSchema();
    const pool = await getPool();
    return upsertPersonRow(pool, personName);
  },

  async deleteExpense(expenseId) {
    await ensureSchema();
    const pool = await getPool();
    const res = await pool.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
    return res.rowCount > 0;
  },
};

/* ── JSON file (local development only) ────────────────────────────────── */

async function readFileStore() {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

async function writeFileStore(people) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(people, null, 2));
}

function findOrCreatePerson(people, personName) {
  const key = normalizeName(personName);
  let person = people.find((p) => normalizeName(p.name) === key);
  if (!person) {
    person = { id: newId(), name: personName.trim(), expenses: [] };
    people.push(person);
  }
  return person;
}

const fileStore = {
  async listPeople() {
    return readFileStore();
  },

  async addExpense({ personName, expense }) {
    const people = await readFileStore();
    const person = findOrCreatePerson(people, personName);
    person.expenses.push(expense);
    person.expenses.sort((a, b) => a.date.localeCompare(b.date));
    await writeFileStore(people);
    return person.id;
  },

  async addPerson(personName) {
    const people = await readFileStore();
    const person = findOrCreatePerson(people, personName);
    await writeFileStore(people);
    return person.id;
  },

  async deleteExpense(expenseId) {
    const people = await readFileStore();
    let removed = false;
    for (const person of people) {
      const before = person.expenses.length;
      person.expenses = person.expenses.filter((e) => e.id !== expenseId);
      if (person.expenses.length !== before) removed = true;
    }
    if (removed) await writeFileStore(people);
    return removed;
  },
};

/* ── Deployed with no database configured ─────────────────────────────── */

// Reads come back empty rather than erroring, so the app still loads and
// shows its normal "nothing filed yet" state instead of a crash — but a
// write fails loudly with the actual reason, because a save that silently
// went nowhere is worse than one that told the user why.
const NOT_CONFIGURED_MESSAGE =
  'לא הוגדר חיבור למסד נתונים בפרויקט הזה (DATABASE_URL) — אין לאן לשמור. יש להוסיף אותו תחת Settings → Environment Variables ב-Vercel ולפרוס מחדש.';

const unconfiguredStore = {
  async listPeople() {
    return [];
  },
  async addExpense() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
  async addPerson() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
  async deleteExpense() {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  },
};

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const store = usingDatabase ? dbStore : (isServerless ? unconfiguredStore : fileStore);

export const listPeople = () => store.listPeople();
export const addExpense = (args) => store.addExpense(args);
export const addPerson = (name) => store.addPerson(name);
export const deleteExpense = (id) => store.deleteExpense(id);

export async function getPerson(personId) {
  const people = await store.listPeople();
  return people.find((p) => p.id === personId) || null;
}
