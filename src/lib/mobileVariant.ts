// TEMPORARY: design-review switch (?mv=1|2|3). Remove once a mobile design is chosen.
import { useEffect, useState } from 'react';

export function useMobileVariant(): number {
  const [v, setV] = useState(1);
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('mv'));
    if (n >= 1 && n <= 3) setV(n);
  }, []);
  return v;
}
