import { useState, useEffect, useRef, useCallback } from 'react';
import {
  cacheGet,
  cacheGetSync,
  cacheSet,
  hasDataChanged,
  preloadMediaImages,
  CacheEnvelope,
} from '../services/cacheService';

export interface UseCachedApiOptions<T> {
  pollingInterval?: number; // Background polling interval in ms (default: 60,000 ms)
  enabled?: boolean; // Whether the fetch/poll is active (default: true)
  revalidateOnMount?: boolean; // Whether to fetch in background on mount (default: true)
  revalidateOnFocus?: boolean; // Revalidate when user returns to window/tab (default: true)
  compareFn?: (cached: T, fresh: T) => boolean; // Custom comparator function
  onUpdate?: (newData: T) => void; // Callback when fresh data differs and is applied
  fallbackData?: T; // Initial fallback data if no cache exists
}

export interface UseCachedApiResult<T> {
  data: T;
  loading: boolean;
  isRevalidating: boolean;
  error: Error | null;
  mutate: (newData?: T | ((prev: T) => T), shouldRevalidate?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * High-performance central caching and state synchronization hook (SWR pattern)
 * for Anime, Manga, Novel, Schedule, Upcoming, and Search tabs.
 */
export function useCachedApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedApiOptions<T> = {}
): UseCachedApiResult<T> {
  const {
    pollingInterval = 60000, // 1 minute default
    enabled = true,
    revalidateOnMount = true,
    revalidateOnFocus = true,
    compareFn = hasDataChanged,
    onUpdate,
    fallbackData,
  } = options;

  // Step 1: Instantly retrieve synchronous cached data from Memory / LocalStorage
  const initialCache = cacheGetSync<T>(key);
  const hasInitialCache = initialCache !== null;

  const [data, setData] = useState<T>(() => {
    if (hasInitialCache) return initialCache as T;
    if (fallbackData !== undefined) return fallbackData;
    return [] as unknown as T;
  });

  const [loading, setLoading] = useState<boolean>(() => !hasInitialCache && fallbackData === undefined);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep references to latest callbacks and state to avoid unnecessary effect triggers
  const dataRef = useRef<T>(data);
  dataRef.current = data;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const compareFnRef = useRef(compareFn);
  compareFnRef.current = compareFn;

  const isMountedRef = useRef(true);

  // Step 2 & 3: Silent background revalidation with deep structural diffing
  const performRevalidation = useCallback(async (isSilent = true) => {
    if (!enabled) return;

    if (!isSilent && isMountedRef.current) {
      setIsRevalidating(true);
    }

    try {
      const freshData = await fetcherRef.current();

      if (!isMountedRef.current) return;

      const currentData = dataRef.current;
      
      // Do not overwrite existing populated data with an empty array if an upstream error/empty response occurs
      const isFreshEmpty = Array.isArray(freshData) && freshData.length === 0;
      const isCurrentPopulated = Array.isArray(currentData) && currentData.length > 0;
      
      if (isFreshEmpty && isCurrentPopulated) {
        // Retain existing valid populated cache quietly
        if (isMountedRef.current) {
          setLoading(false);
        }
        return;
      }

      const isDifferent = compareFnRef.current(currentData, freshData);

      if (isDifferent) {
        // Step 4: If new content exists, seamlessly update cache and re-render React state
        await cacheSet(key, freshData);

        if (isMountedRef.current) {
          setData(freshData);
          dataRef.current = freshData;
          if (Array.isArray(freshData)) {
            preloadMediaImages(freshData);
          }
          if (onUpdateRef.current) {
            onUpdateRef.current(freshData);
          }
        }
      } else {
        // If structurally identical, simply update the timestamp in the cache envelope quietly
        await cacheSet(key, currentData);
        if (Array.isArray(currentData)) {
          preloadMediaImages(currentData);
        }
      }

      if (isMountedRef.current) {
        setError(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.warn(`[useCachedApi] Background fetch failed for key "${key}":`, err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // If we don't have data at all, turn off loading so UI doesn't hang
        setLoading(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRevalidating(false);
      }
    }
  }, [key, enabled]);

  // Initial mount: Check async IndexedDB if memory cache was not yet populated, then revalidate
  useEffect(() => {
    isMountedRef.current = true;

    async function initFromStorage() {
      // If we didn't get a sync cache hit, check IndexedDB
      if (!hasInitialCache) {
        const idbCached = await cacheGet<T>(key);
        if (idbCached !== null && isMountedRef.current) {
          setData(idbCached);
          dataRef.current = idbCached;
          if (Array.isArray(idbCached)) {
            preloadMediaImages(idbCached);
          }
          setLoading(false);
        }
      }

      if (revalidateOnMount && enabled) {
        performRevalidation(hasInitialCache);
      }
    }

    initFromStorage();

    return () => {
      isMountedRef.current = false;
    };
  }, [key, enabled, revalidateOnMount, performRevalidation]);

  // Step 2 & 5: Continuous background polling timer
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return;

    const timer = setInterval(() => {
      // Only poll if document is visible to save battery/bandwidth
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        performRevalidation(true);
      }
    }, pollingInterval);

    return () => clearInterval(timer);
  }, [enabled, pollingInterval, performRevalidation]);

  // Revalidate on window focus / tab visibility change
  useEffect(() => {
    if (!enabled || !revalidateOnFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        performRevalidation(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [enabled, revalidateOnFocus, performRevalidation]);

  // Manual mutation helper
  const mutate = useCallback(async (
    newData?: T | ((prev: T) => T),
    shouldRevalidate = true
  ) => {
    if (newData !== undefined) {
      const resolved = typeof newData === 'function' ? (newData as any)(dataRef.current) : newData;
      setData(resolved);
      dataRef.current = resolved;
      await cacheSet(key, resolved);
    }

    if (shouldRevalidate) {
      await performRevalidation(false);
    }
  }, [key, performRevalidation]);

  // Manual refresh helper
  const refresh = useCallback(async () => {
    await performRevalidation(false);
  }, [performRevalidation]);

  return {
    data,
    loading,
    isRevalidating,
    error,
    mutate,
    refresh,
  };
}
