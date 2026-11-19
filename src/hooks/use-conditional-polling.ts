'use client';

import { useEffect } from 'react';

/** Serial, visible-tab polling. Errors stop the loop until its context is reset. */
export function useConditionalPolling(
  active: boolean,
  refresh: (signal: AbortSignal) => Promise<void>,
  interval = 15_000,
) {
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let stopped = false;
    let pending = false;
    let failed = false;
    const clear = () => clearTimeout(timer);
    function schedule() {
      clear();
      if (!stopped && !failed && !pending && document.visibilityState === 'visible')
        timer = setTimeout(() => void tick(), interval);
    }
    async function tick() {
      if (stopped || document.visibilityState !== 'visible') return;
      pending = true;
      controller = new AbortController();
      try {
        await refresh(controller.signal);
      } catch {
        // Includes access errors and proxy HTML responses: no endless automatic retries.
        failed = true;
      } finally {
        pending = false;
        schedule();
      }
    }
    const visibility = () => {
      if (document.visibilityState !== 'visible') clear();
      else schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true;
      clear();
      controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, refresh, interval]);
}
