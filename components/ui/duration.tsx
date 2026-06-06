"use client";

import { useTimer } from "@/hooks/use-timer";
import { formatDuration, formatDurationISO8601 } from "@/lib/time";
import { useEffect } from "react";

interface DurationProps extends Omit<React.ComponentProps<"time">, "dateTime"> {
  /** Duration in seconds. */
  duration: number;
  realTime?: boolean;
  isPadded?: boolean;
  isSemantic?: boolean;
  countDown?: boolean;
}

export function Duration({
  duration,
  realTime = true,
  isPadded = true,
  isSemantic = false,
  countDown = false,
  ...props
}: DurationProps) {
  const { elapsed, setElapsed } = useTimer(duration * 1000, {
    enabled: realTime ?? true,
    countDown,
  });

  useEffect(() => {
    setElapsed(duration * 1000);
  }, [duration, setElapsed]);

  const dateTime = formatDurationISO8601(elapsed / 1000);

  return (
    <time dateTime={dateTime} {...props}>
      {formatDuration(elapsed / 1000, isPadded, isSemantic)}
    </time>
  );
}
