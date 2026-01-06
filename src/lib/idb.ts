// src/lib/idb.ts
// Minimal IndexedDB wrapper to store uploaded CSV texts.

import { DB_NAME, DB_STORE, type CsvKind, DEFAULT_EVENT_ID } from "./config";

type StoredFile = {
  key: string; // Composite key: "{eventId}:{kind}"
  eventId: string;
  kind: CsvKind;
  text: string;
  filename: string;
  updatedAt: number;
  rows: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(DB_STORE, mode);
    const store = t.objectStore(DB_STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putCsvFile(args: {
  kind: CsvKind;
  text: string;
  filename: string;
  rows: number;
  eventId?: string;
}): Promise<void> {
  const db = await openDb();
  const eventId = args.eventId || DEFAULT_EVENT_ID;
  const key = `${eventId}:${args.kind}`;

  const value: StoredFile = {
    key,
    eventId,
    kind: args.kind,
    text: args.text,
    filename: args.filename,
    updatedAt: Date.now(),
    rows: args.rows,
  };
  await tx(db, "readwrite", (s) => s.put(value));
  db.close();
}

export async function getCsvFile(
  kind: CsvKind,
  eventId: string = DEFAULT_EVENT_ID
): Promise<StoredFile | null> {
  const db = await openDb();
  const key = `${eventId}:${kind}`;
  const result = await tx(db, "readonly", (s) => s.get(key));
  db.close();
  return (result as any) || null;
}

export async function deleteCsvFile(
  kind: CsvKind,
  eventId: string = DEFAULT_EVENT_ID
): Promise<void> {
  const db = await openDb();
  const key = `${eventId}:${kind}`;
  await tx(db, "readwrite", (s) => s.delete(key));
  db.close();
}

export async function listCsvMeta(eventId?: string): Promise<
  Array<Pick<StoredFile, "key" | "kind" | "filename" | "updatedAt" | "rows">>
> {
  const db = await openDb();
  const result = await new Promise<any[]>((resolve, reject) => {
    const t = db.transaction(DB_STORE, "readonly");
    const store = t.objectStore(DB_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();

  let filtered = result || [];

  if (eventId) {
    filtered = filtered.filter((x: any) => x.eventId === eventId);
  }

  return filtered.map((x: any) => ({
    key: x.kind,
    kind: x.kind,
    filename: x.filename,
    updatedAt: x.updatedAt,
    rows: x.rows,
  }));
}
