import { migrate, type GameState } from './state';

/**
 * Saves live in IndexedDB. Each write keeps the previous good save in a
 * second slot, so a bad write can never wipe progress.
 */

const DB_NAME = 'ewe-and-me';
const STORE = 'saves';
const MAIN = 'main';
const PREVIOUS = 'previous';
const BACKUP_PREFIX = 'EWEANDME1:';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

/** Ask the browser not to clear our storage under pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

export async function loadGame(): Promise<GameState | null> {
  for (const slot of [MAIN, PREVIOUS]) {
    try {
      const json = await tx<string>('readonly', (s) => s.get(slot));
      if (!json) continue;
      return migrate(JSON.parse(json));
    } catch (err) {
      console.error(`[save] could not read the "${slot}" save`, err);
    }
  }
  return null;
}

export async function writeGame(state: GameState): Promise<void> {
  const json = JSON.stringify(state);
  await tx('readwrite', (s) => {
    const getMain = s.get(MAIN);
    getMain.onsuccess = () => {
      if (getMain.result) s.put(getMain.result, PREVIOUS);
      s.put(json, MAIN);
    };
  });
}

/* ---------- Backup codes ---------- */

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** A copyable text code containing the whole save. */
export function exportCode(state: GameState): string {
  return BACKUP_PREFIX + toBase64(JSON.stringify(state));
}

/**
 * Accepts either a backup code or the raw JSON of a downloaded backup file.
 * Throws a friendly error if it isn't a valid save.
 */
export function importCode(input: string): GameState {
  const trimmed = input.trim();
  // Backup codes can pick up line breaks when copied; JSON files are used as-is.
  const text = trimmed.startsWith('{') ? trimmed : trimmed.replace(/\s+/g, '');
  let json: string;
  if (text.startsWith('{')) json = text;
  else if (text.startsWith(BACKUP_PREFIX)) {
    try {
      json = fromBase64(text.slice(BACKUP_PREFIX.length));
    } catch {
      throw new Error('That backup code looks damaged. Check that the whole code was copied.');
    }
  } else throw new Error('That doesn’t look like an Ewe and Me backup.');
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('That backup code looks damaged. Check that the whole code was copied.');
  }
  return migrate(raw);
}

export function downloadBackup(state: GameState): void {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ewe-and-me-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
