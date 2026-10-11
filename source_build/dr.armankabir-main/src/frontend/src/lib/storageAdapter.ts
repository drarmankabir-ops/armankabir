/**
 * Server-backed preference boundary.
 *
 * Storage is a per-account key/value map served by `/api/preferences/*`.
 * Keys are scoped to the authenticated principal, so accounts never share data.
 *
 * Authentication material is refused client-side as defence in depth; the PHP
 * layer rejects these keys independently (see forbiddenPreferenceKeys()).
 */
import { get, post } from './apiClient';

const MAX_KEY_LENGTH = 191;

// Mirrors forbiddenPreferenceKeys() in api/preferences/bootstrap.php.
const credentialKeyPattern =
  /^(staff_auth|phpauthtoken|auth_?token|access_?token|refresh_?token|session_?token|jwt|id_?token|medicare_(current|logged_in)_doctor|password|password_?hash|secret|api_?key|csrf_?token)$/i;

function assertPreferenceKey(key: string): void {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error(`Invalid preference key: ${String(key)}`);
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new Error(`Preference key is too long: ${key.slice(0, 32)}`);
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(key)) {
    throw new Error('Preference key contains control characters.');
  }
  if (credentialKeyPattern.test(key)) {
    throw new Error(`Refusing to store credential material: ${key}`);
  }
}/**
 * Server-backed preference boundary.
 *
 * Storage is a per-account key/value map served by `/api/preferences/*`.
 * Keys are scoped to the authenticated principal, so accounts never share data.
 *
 * Authentication material is refused client-side as defence in depth; the PHP
 * layer rejects these keys independently (see forbiddenPreferenceKeys()).
 */
import { get, post } from './apiClient';

const MAX_KEY_LENGTH = 191;

// Mirrors forbiddenPreferenceKeys() in api/preferences/bootstrap.php.
const credentialKeyPattern =
  /^(staff_auth|phpauthtoken|auth_?token|access_?token|refresh_?token|session_?token|jwt|id_?token|medicare_(current|logged_in)_doctor|password|password_?hash|secret|api_?key|csrf_?token)$/i;

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
  if (credentialKeyPattern.test(key)) {
    throw new Error(`Refusing to store credential material: ${key}`);
  }
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    assertPreferenceKey(key);
    try {
      return (await get<{ value?: string | null }>('/preferences/get.php', { key }))?.value ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    assertPreferenceKey(key);
    await post('/preferences/set.php', { key, value });
  },
  async removeItem(key: string): Promise<void> {
    assertPreferenceKey(key);
    await post('/preferences/remove.php', { key });
  },
  async clear(): Promise<void> {
    await post('/preferences/clear.php', {});
  },
  async length(): Promise<number> {
    return (await get<{ count?: number }>('/preferences/count.php'))?.count ?? 0;
  },
  async key(index: number): Promise<string | null> {
    return (await get<{ key?: string | null }>('/preferences/key.php', { index }))?.key ?? null;
  },
};

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await storage.getItem(key);
  if (raw === null) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setJson(key: string, data: unknown): Promise<void> {
  return storage.setItem(key, JSON.stringify(data));
}

export async function getItemOr<T>(key: string, defaultValue: T): Promise<T> {
  return (await getJson<T>(key)) ?? defaultValue;
}

export function setItemJson(key: string, data: unknown): Promise<void> { return setJson(key, data); }
export function removeItemKey(key: string): Promise<void> { return storage.removeItem(key); }
