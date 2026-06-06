interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function parseDuration(duration: number): DurationParts {
  const total = Math.max(0, Math.floor(duration));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return { hours, minutes, seconds };
}

/**
 * Format duration in seconds as human-readable string.
 * @param duration Duration in seconds.
 * @param padded Whether to include empty time parts and display zeros (e.g. `"00:10:30"` instead of `"10:30"`)
 * @param semantic Whether to use semantic time format (e.g. `"1h30m45s"` instead of `"1:30:45"`)
 * @returns Human-readable duration string.
 */
export function formatDuration(
  duration: number,
  padded: boolean = false,
  semantic: boolean = false
): string {
  const { hours, minutes, seconds } = parseDuration(duration);

  const parts = [];

  if (hours > 0) {
    parts.push(hours.toString().padStart(2, "0"));
  } else if (padded || parts.length > 0) {
    parts.push("00");
  }

  if (semantic && parts.length === 1) {
    parts.push("h");
  }

  if (minutes > 0) {
    parts.push(minutes.toString().padStart(2, "0"));
  } else if (padded || parts.length > 0) {
    parts.push("00");
  }

  if (semantic && parts.length >= 2) {
    parts.push("m");
  }

  if (seconds > 0) {
    parts.push(seconds.toString().padStart(2, "0"));
  } else if (padded || parts.length > 0) {
    parts.push("00");
  }

  if (semantic && parts.length >= 3) {
    parts.push("s");
  }

  return parts.join(semantic ? "" : ":");
}

/**
 * Format duration in seconds as ISO 8601 duration string.
 * @param duration Duration in seconds.
 * @returns ISO 8601 duration string.
 * @example "PT1H30M45S"
 */
export function formatDurationISO8601(duration: number): string {
  const { hours, minutes, seconds } = parseDuration(duration);
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}H`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}M`);
  }

  if (seconds > 0) {
    parts.push(`${seconds}S`);
  }

  return "PT" + parts.join("");
}
