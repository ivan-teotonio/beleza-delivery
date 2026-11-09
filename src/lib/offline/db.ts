import * as SQLite from 'expo-sqlite';
import { novaChaveIdempotencia } from '../idempotency';

/**
 * Cache local (SQLite) — apenas leitura offline, outbox e geocache.
 * O Supabase continua sendo a fonte de verdade (RN20/RNF07).
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('beleza-delivery.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pendente',
          next_attempt_at TEXT NOT NULL,
          last_error TEXT
        );
        CREATE TABLE IF NOT EXISTS geocode_cache (
          hash TEXT PRIMARY KEY NOT NULL,
          label TEXT,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_state (
          entity TEXT PRIMARY KEY NOT NULL,
          cursor TEXT,
          synced_at TEXT
        );
      `);
      return db;
    })().catch((erro) => {
      dbPromise = null;
      throw erro;
    });
  }
  return dbPromise;
}

export interface CacheEntry<T> {
  value: T;
  updatedAt: string;
}

export async function cacheGet<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ payload: string; updated_at: string }>(
      'SELECT payload, updated_at FROM cache WHERE key = ?',
      key,
    );
    if (!row) return null;
    return { value: JSON.parse(row.payload) as T, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO cache (key, payload, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      key,
      JSON.stringify(value),
      new Date().toISOString(),
    );
  } catch {
    // Cache é best-effort; nunca deve quebrar a tela.
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM cache WHERE key = ?', key);
  } catch {
    // ignore
  }
}

export async function cacheClear(): Promise<void> {
  try {
    const db = await getDb();
    await db.execAsync('DELETE FROM cache; DELETE FROM outbox; DELETE FROM geocode_cache;');
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// Outbox
// ------------------------------------------------------------
export type OutboxStatus = 'pendente' | 'enviando' | 'falhou' | 'concluido';

export interface OutboxItem {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  status: OutboxStatus;
  nextAttemptAt: string;
  lastError?: string | null;
}

export async function enqueueOutbox(
  kind: string,
  payload: Record<string, unknown>,
): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: novaChaveIdempotencia(),
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pendente',
    nextAttemptAt: new Date().toISOString(),
    lastError: null,
  };
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO outbox (id, kind, payload, created_at, attempts, status, next_attempt_at, last_error)
     VALUES (?, ?, ?, ?, 0, 'pendente', ?, NULL)`,
    item.id,
    item.kind,
    JSON.stringify(item.payload),
    item.createdAt,
    item.nextAttemptAt,
  );
  return item;
}

export async function listOutboxPendente(): Promise<OutboxItem[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string;
      kind: string;
      payload: string;
      created_at: string;
      attempts: number;
      status: OutboxStatus;
      next_attempt_at: string;
      last_error: string | null;
    }>(
      `SELECT * FROM outbox
       WHERE status IN ('pendente','falhou')
         AND next_attempt_at <= ?
       ORDER BY created_at ASC`,
      new Date().toISOString(),
    );
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      payload: JSON.parse(r.payload) as Record<string, unknown>,
      createdAt: r.created_at,
      attempts: r.attempts,
      status: r.status,
      nextAttemptAt: r.next_attempt_at,
      lastError: r.last_error,
    }));
  } catch {
    return [];
  }
}

export async function marcarOutbox(
  id: string,
  status: OutboxStatus,
  lastError?: string,
): Promise<void> {
  try {
    const db = await getDb();
    if (status === 'falhou') {
      const row = await db.getFirstAsync<{ attempts: number }>(
        'SELECT attempts FROM outbox WHERE id = ?',
        id,
      );
      const tentativas = (row?.attempts ?? 0) + 1;
      const esperaMs = Math.min(5 * 60_000, 2 ** tentativas * 2_000);
      await db.runAsync(
        `UPDATE outbox
            SET status = ?, attempts = ?, last_error = ?, next_attempt_at = ?
          WHERE id = ?`,
        status,
        tentativas,
        lastError ?? null,
        new Date(Date.now() + esperaMs).toISOString(),
        id,
      );
      return;
    }
    if (status === 'concluido') {
      await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
      return;
    }
    await db.runAsync(
      'UPDATE outbox SET status = ?, last_error = ? WHERE id = ?',
      status,
      lastError ?? null,
      id,
    );
  } catch {
    // ignore
  }
}

export async function contarOutboxPendente(): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM outbox WHERE status IN ('pendente','falhou','enviando')`,
    );
    return row?.total ?? 0;
  } catch {
    return 0;
  }
}

// ------------------------------------------------------------
// Geocache
// ------------------------------------------------------------
export async function geocodeGet(
  hash: string,
): Promise<{ lat: number; lng: number; label: string | null } | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ lat: number; lng: number; label: string | null; expires_at: string }>(
      'SELECT lat, lng, label, expires_at FROM geocode_cache WHERE hash = ?',
      hash,
    );
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await db.runAsync('DELETE FROM geocode_cache WHERE hash = ?', hash);
      return null;
    }
    return { lat: row.lat, lng: row.lng, label: row.label };
  } catch {
    return null;
  }
}

export async function geocodeSet(
  hash: string,
  lat: number,
  lng: number,
  label: string | null,
): Promise<void> {
  try {
    const db = await getDb();
    const expira = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    await db.runAsync(
      `INSERT INTO geocode_cache (hash, label, lat, lng, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(hash) DO UPDATE SET label = excluded.label, lat = excluded.lat,
         lng = excluded.lng, expires_at = excluded.expires_at`,
      hash,
      label,
      lat,
      lng,
      expira,
    );
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// Cursor de sincronização e exportação (LGPD/RNF06)
// ------------------------------------------------------------
export async function setSyncCursor(entity: string, cursor: string | null): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_state (entity, cursor, synced_at) VALUES (?, ?, ?)
       ON CONFLICT(entity) DO UPDATE SET cursor = excluded.cursor, synced_at = excluded.synced_at`,
      entity,
      cursor,
      new Date().toISOString(),
    );
  } catch {
    // ignore
  }
}

export async function getSyncCursor(entity: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ cursor: string | null }>(
      'SELECT cursor FROM sync_state WHERE entity = ?',
      entity,
    );
    return row?.cursor ?? null;
  } catch {
    return null;
  }
}

export async function exportarDadosLocais(): Promise<Record<string, unknown>> {
  try {
    const db = await getDb();
    const cache = await db.getAllAsync('SELECT key, payload, updated_at FROM cache');
    const outbox = await db.getAllAsync('SELECT * FROM outbox');
    const geocode = await db.getAllAsync('SELECT * FROM geocode_cache');
    return {
      exportado_em: new Date().toISOString(),
      cache,
      outbox,
      geocode,
    };
  } catch {
    return { exportado_em: new Date().toISOString(), cache: [], outbox: [], geocode: [] };
  }
}
