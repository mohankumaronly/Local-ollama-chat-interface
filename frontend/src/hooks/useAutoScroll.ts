import { useEffect, useRef } from 'react';

/**
 * Auto-scrolls a container to the bottom whenever `deps` change,
 * but only if the user is already near the bottom (so they can
 * scroll up to read without being yanked down).
 */
export function useAutoScroll<T extends HTMLElement>(
  deps: unknown,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      pinnedRef.current = distanceFromBottom < 80;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (pinnedRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [deps]);

  return ref;
}
