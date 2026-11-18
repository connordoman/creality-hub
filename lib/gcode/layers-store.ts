import type { ParsedGcodeLayers } from "@/lib/gcode/layers";

/**
 * Parsed layers kept in IndexedDB so a reload skips both the download and the
 * parse. Entries are keyed by filename and checked against the server's ETag.
 * Every function fails soft: storage is only an optimization.
 */
const DB_NAME = "creality-hub-gcode";
const STORE = "layers";
const BY_DATE = "storedAt";
const MAX_ENTRIES = 3;

export interface StoredGcodeLayers {
  filename: string;
  etag: string;
  storedAt: number;
  result: ParsedGcodeLayers;
}

export function openLayersStore(): Promise<IDBDatabase | null> {
  return new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result
          .createObjectStore(STORE, { keyPath: "filename" })
          .createIndex(BY_DATE, "storedAt");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadStoredLayers(
  db: IDBDatabase,
  filename: string,
): Promise<StoredGcodeLayers | null> {
  try {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(filename);
    await done(tx);
    return (request.result as StoredGcodeLayers | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * Writes an entry and drops all but the newest few. The entry is cloned
 * before this returns, so its buffers may be transferred right away; await
 * the promise before the context goes away.
 */
export function storeLayers(
  db: IDBDatabase,
  entry: StoredGcodeLayers,
): Promise<void> {
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put(entry);

    // Walk keys newest-first without loading the (large) values.
    let seen = 0;
    const cursor = store.index(BY_DATE).openKeyCursor(null, "prev");
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) {
        return;
      }
      if (++seen > MAX_ENTRIES) {
        store.delete(current.primaryKey);
      }
      current.continue();
    };

    return done(tx).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}
