'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const preferenceKey = 'intgrte:sidebar-collapsed';
export function useWorkspaceSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const previous = useRef(false);
  const animation = useRef<Animation | null>(null);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(preferenceKey) === 'true');
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  useLayoutEffect(() => {
    const changed = previous.current !== collapsed;
    previous.current = collapsed;
    const main = mainRef.current;
    if (
      !main ||
      !changed ||
      matchMedia('(max-width: 760px), (prefers-reduced-motion: reduce)').matches
    )
      return;
    // Reflow the workspace once, then move it with a compositor animation.
    // Charts and document previews do not resize on every animation frame.
    const remaining = animation.current ? new DOMMatrix(getComputedStyle(main).transform).m41 : 0;
    animation.current?.cancel();
    animation.current = main.animate(
      [
        { transform: `translateX(${(collapsed ? 200 : -200) + remaining}px)` },
        { transform: 'translateX(0)' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [collapsed]);
  useEffect(() => () => animation.current?.cancel(), []);
  const toggle = () =>
    setCollapsed((current) => {
      try {
        localStorage.setItem(preferenceKey, String(!current));
      } catch {
        /* Keep the control usable without persistence. */
      }
      return !current;
    });
  return { collapsed, toggle, mainRef };
}
