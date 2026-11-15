/**
 * Safe Web Storage wrappers with in-memory fallback.
 * Prevents SecurityError / QuotaExceededError crashes in restricted iframes,
 * Safari ITP, private browsing, or WebViews.
 */

const createSafeStorage = (type: 'localStorage' | 'sessionStorage'): Storage => {
  const memoryFallback = new Map<string, string>();

  const getNative = (): Storage | null => {
    try {
      if (typeof window === 'undefined') return null;
      const store = window[type];
      if (!store) return null;
      return store;
    } catch {
      return null;
    }
  };

  return {
    get length(): number {
      try {
        const native = getNative();
        if (native) return native.length;
      } catch {}
      return memoryFallback.size;
    },
    clear(): void {
      memoryFallback.clear();
      try {
        getNative()?.clear();
      } catch {}
    },
    getItem(key: string): string | null {
      try {
        const native = getNative();
        if (native) {
          const val = native.getItem(key);
          if (val !== null) return val;
        }
      } catch {}
      return memoryFallback.has(key) ? memoryFallback.get(key)! : null;
    },
    key(index: number): string | null {
      try {
        const native = getNative();
        if (native) return native.key(index);
      } catch {}
      return Array.from(memoryFallback.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      memoryFallback.delete(key);
      try {
        getNative()?.removeItem(key);
      } catch {}
    },
    setItem(key: string, value: string): void {
      const str = String(value);
      memoryFallback.set(key, str);
      try {
        getNative()?.setItem(key, str);
      } catch {}
    },
  };
};

export const safeLocalStorage: Storage = createSafeStorage('localStorage');
export const safeSessionStorage: Storage = createSafeStorage('sessionStorage');

export const safeGetJson = <T,>(
  key: string,
  fallback: T,
  storage: Storage = safeLocalStorage
): T => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
};
