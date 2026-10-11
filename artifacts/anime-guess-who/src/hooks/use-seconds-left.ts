import { useEffect, useState } from "react";

// Seconds remaining until `deadline` (epoch ms), ticking every 250 ms.
export function useSecondsLeft(deadline: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
