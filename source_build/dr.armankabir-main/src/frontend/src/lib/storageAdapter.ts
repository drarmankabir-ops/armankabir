/**
 * Synchronous in-memory compatibility cache backed by authenticated PHP storage.
 *
 * Browser storage is read only by the one-time importer. After import, values
 * are hydrated from PHP and all writes are sent to the PHP preferences API.
 */
import { get, post } from './apiClient';

const MAX_KEY_LENGTH = 191;
const CACHE = new Map<string, string>();
let initialized = false;
let initializedOwner: string | null = null;
let initialization: Promise<void> | null = null;
let writeQueue = Promise.resolve();
let generation = 0;

const forbiddenCredentialKey =
  /(auth|token|password|secret|credential|csrf)/i;
const forbiddenCredentialKeys = new Set([
  'staff_auth',
  'phpauthtoken',
  'medicare_current_doctor',
  'medicare_logged_in_doctor',
]);

function assertPreferenceKey(key: string): void {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error(`Invalid preference key: ${String(key)}`);
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new Error(`Preference key is too long: ${key.slice(0, 32)}...`);
  }
  if (/[\u0000-\u001F\u007F]/.test(key)) {
    throw new Error('Preference key contains control characters.');
  }
  if (isCredentialKey(key)) {
    throw new Error(`Refusing to persist credential material: ${key}`);
  }
}

function isCredentialKey(key: string): boolean {
  return forbiddenCredentialKey.test(key) || forbiddenCredentialKeys.has(key.toLowerCase());
}

function reportWriteFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  window.dispatchEvent(
    new CustomEvent('server-storage-error', { detail: { message } }),
  );
}

function persist(operation: () => Promise<unknown>): void {
  const owner = initializedOwner;
  if (!owner) {
    reportWriteFailure(new Error('PHP storage is not initialized for an account.'));
    return;
  }
  writeQueue = writeQueue
    .then(() => {
      if (owner !== initializedOwner) return;
      return operation();
    })
    .catch((error: unknown) => {
      reportWriteFailure(error);
    });
}

function browserStores(): Storage[] {
  if (typeof window === 'undefined') return [];
  return [window.localStorage, window.sessionStorage];
}

function legacyEntries(): Array<{
  key: string;
  sourceKey: string;
  value: string;
  store: Storage;
}> {
  const entries = new Map<
    string,
    { key: string; sourceKey: string; value: string; store: Storage }
  >();
  for (const [storeIndex, store] of browserStores().entries()) {
    for (let index = 0; index < store.length; index++) {
      const sourceKey = store.key(index);
      if (sourceKey === null || isCredentialKey(sourceKey)) continue;
      const key = storeIndex === 1 ? `session:${sourceKey}` : sourceKey;
      try {
        assertPreferenceKey(key);
      } catch {
        continue;
      }
      const value = store.getItem(sourceKey);
      if (value !== null) entries.set(key, { key, sourceKey, value, store });
    }
  }
  return [...entries.values()];
}

async function migrateLegacyEntries(expectedGeneration: number): Promise<void> {
  const entries = legacyEntries();
  const batchSize = 5;

  for (let offset = 0; offset < entries.length; offset += batchSize) {
    const batch = entries.slice(offset, offset + batchSize);
    await post<{ imported: number }>('/preferences/import.php', {
      entries: batch.map(({ key, value }) => ({ key, value })),
    });
    if (expectedGeneration !== generation) return;
    for (const entry of batch) {
      CACHE.set(entry.key, entry.value);
      entry.store.removeItem(entry.sourceKey);
    }
  }
  for (const store of browserStores()) {
    for (let index = store.length - 1; index >= 0; index--) {
      const key = store.key(index);
      if (key !== null && isCredentialKey(key)) store.removeItem(key);
    }
  }
}

async function hydrateFromServer(expectedGeneration: number): Promise<void> {
  await migrateLegacyEntries(expectedGeneration);
  if (expectedGeneration !== generation) return;
  const values = await get<Record<string, string>>('/preferences/list.php');
  if (expectedGeneration !== generation) return;
  CACHE.clear();
  for (const [key, value] of Object.entries(values ?? {})) {
    if (typeof value === 'string') CACHE.set(key, value);
  }
  initialized = true;
}

export function initializeServerStorage(owner: string): Promise<void> {
  if (initialized && initializedOwner === owner) return Promise.resolve();
  if (initialization && initializedOwner === owner) return initialization;
  initialized = false;
  initializedOwner = owner;
  CACHE.clear();
  const currentGeneration = ++generation;
  initialization = writeQueue.then(() =>
    hydrateFromServer(currentGeneration).catch((error: unknown) => {
      if (currentGeneration !== generation) return;
      initializedOwner = null;
      initialization = null;
      throw error;
    }),
  );
  return initialization;
}

export function resetServerStorage(): void {
  generation++;
  initialized = false;
  initializedOwner = null;
  initialization = null;
  CACHE.clear();
}

export const storage = {
  getItem(key: string): string | null {
    assertPreferenceKey(key);
    return CACHE.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    assertPreferenceKey(key);
    CACHE.set(key, String(value));
    persist(() => post('/preferences/set.php', { key, value: String(value) }));
  },
  removeItem(key: string): void {
    assertPreferenceKey(key);
    CACHE.delete(key);
    persist(() => post('/preferences/remove.php', { key }));
  },
  clear(): void {
    CACHE.clear();
    persist(() => post('/preferences/clear.php', {}));
  },
  get length(): number {
    return CACHE.size;
  },
  key(index: number): string | null {
    return [...CACHE.keys()][index] ?? null;
  },
  keys(): string[] {
    return [...CACHE.keys()];
  },
};

export function getJson<T>(key: string): T | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson(key: string, data: unknown): void {
  storage.setItem(key, JSON.stringify(data));
}

export function getItemOr<T>(key: string, defaultValue: T): T {
  return getJson<T>(key) ?? defaultValue;
}

export function setItemJson(key: string, data: unknown): void {
  setJson(key, data);
}

export function removeItemKey(key: string): void {
  storage.removeItem(key);
}
