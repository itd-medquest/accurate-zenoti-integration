'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConditionalPolling } from './use-conditional-polling';

export function usePolledResource<T>({
  fetcher,
  shouldPoll,
  enabled = true,
  revision = 0,
  delay = 250,
  fallback,
}: {
  fetcher: (signal: AbortSignal) => Promise<T>;
  shouldPoll: (data: T) => boolean;
  enabled?: boolean;
  revision?: number;
  delay?: number;
  fallback: string;
}) {
  const [data, setData] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const started = useRef<number | null>(null);
  const pending = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);

  const read = useCallback(
    (signal?: AbortSignal): Promise<void> => {
      if (!enabled || signal?.aborted) return Promise.resolve();
      // Manual refreshes and background reads share an in-flight request.
      if (pending.current) return pending.current.promise;
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      const current = generation.current;
      started.current = current;
      setBusy(true);
      const promise = Promise.resolve()
        .then(() => fetcher(controller.signal))
        .then((result) => {
          if (current !== generation.current || controller.signal.aborted) return;
          setData(result);
          setError('');
        })
        .catch((cause: unknown) => {
          if (current !== generation.current || controller.signal.aborted) return;
          setError(cause instanceof Error ? cause.message : fallback);
          throw cause;
        })
        .finally(() => {
          signal?.removeEventListener('abort', abort);
          if (pending.current?.controller === controller) {
            pending.current = null;
            setBusy(false);
          }
        });
      pending.current = { controller, promise };
      return promise;
    },
    [enabled, fetcher, fallback],
  );

  // Public list refresh buttons do not produce unhandled promise rejections.
  const load = useCallback(() => read().catch(() => {}), [read]);
  const poll = useCallback((signal: AbortSignal) => read(signal), [read]);
  useEffect(() => {
    setError('');
    setBusy(false);
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waiting = true;
    const start = () => {
      if (!waiting || document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        waiting = false;
        if (started.current !== generation.current) void load();
      }, delay);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', start);
      ++generation.current;
      pending.current?.controller.abort();
      pending.current = null;
    };
  }, [enabled, read, load, revision, delay]);

  useConditionalPolling(enabled && !!data && !error && shouldPoll(data), poll);
  return { data, setData, busy, error, load, read };
}
