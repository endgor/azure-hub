// TEMPORARY: design-review switches (?mv=1|2|3, ?dv=1|2). Remove once designs are chosen.
import { useEffect, useState } from 'react';

export function useMobileVariant(param = 'mv', fallback = 1): number {
  const [v, setV] = useState(fallback);
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get(param));
    if (n >= 1 && n <= 3) setV(n);
  }, [param]);
  return v;
}
