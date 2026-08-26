/**
 * Safe LocalStorage Utility with automatic quota handling,
 * cache eviction, and exception protection.
 */

const CACHE_PREFIX = 'satori_cache_';

/**
 * Purges transient cache entries from localStorage to free up quota
 * for critical user state (Library, Settings, Profile, History).
 */
export function purgeTransientCacheFromLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // Ignore
      }
    });
  } catch {
    // Ignore
  }
}

/**
 * Safely get a parsed or raw value from localStorage
 */
export function safeGetItem<T = string>(key: string, fallback: T, parseJson: boolean = false): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    if (parseJson) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    }
    return raw as unknown as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely set a value in localStorage with automatic cache eviction on QuotaExceededError
 */
export function safeSetItem(key: string, value: any, stringify: boolean = true): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const serialized = stringify ? JSON.stringify(value) : String(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    // Check if error is QuotaExceededError
    const isQuotaError =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        (err.message && err.message.includes('quota')));

    if (isQuotaError) {
      console.warn(`[Storage] LocalStorage quota exceeded when writing "${key}". Evicting transient cache...`);
      // Evict transient cache items
      purgeTransientCacheFromLocalStorage();

      // Retry once after eviction
      try {
        const serialized = stringify ? JSON.stringify(value) : String(value);
        window.localStorage.setItem(key, serialized);
        return true;
      } catch (retryErr) {
        console.warn(`[Storage] Failed writing "${key}" even after cache purge:`, retryErr);
        return false;
      }
    }

    console.warn(`[Storage] Error writing "${key}" to localStorage:`, err);
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
