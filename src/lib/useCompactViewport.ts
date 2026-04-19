import { useEffect, useState } from 'react';

/** Coincide con breakpoint `sm` de Tailwind (móvil estrecho). */
const COMPACT_QUERY = '(max-width: 639.98px)';

/**
 * true en viewports estrechos (típicamente móvil en vertical).
 * Útil para márgenes de gráficos y tablas sin depender solo de clases CSS.
 */
export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(COMPACT_QUERY).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const fn = () => setCompact(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  return compact;
}
