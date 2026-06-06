import { useEffect, useState } from "react";

interface UseTimerOptions {
  intervalMs?: number;
  countDown?: boolean;
  enabled?: boolean;
}

export function useTimer(
  initialValue: number,
  { intervalMs = 1000, countDown = false, enabled = true }: UseTimerOptions = {}
) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const direction = countDown ? -1 : 1;
      setValue((v) => v + direction * intervalMs);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, countDown, enabled]);

  return { elapsed: value, setElapsed: setValue };
}
