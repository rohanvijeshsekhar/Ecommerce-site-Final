import { useState, useEffect, useCallback } from 'react';

/**
 * A generic localStorage-backed useState hook.
 * Reads from localStorage on mount and syncs writes back.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize from localStorage after mounting on the client to prevent SSR hydration mismatches
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch {
      // ignore
    }
  }, [key]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // localStorage may be unavailable (private mode, quota exceeded)
        }
        return next;
      });
    },
    [key]
  );

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // ignore parse errors from other tabs
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  return [storedValue, setValue];
}
