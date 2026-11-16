'use client';
import { useEffect } from 'react';

export function useAutoDismiss(active: unknown, onDismiss: () => void, duration = 6500) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [active, onDismiss, duration]);
}
