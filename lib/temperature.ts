export function formatTemperature(
  celsius: number | null | undefined,
  precision: number = 1
): string {
  if (!celsius || !Number.isFinite(celsius)) {
    return "\u2014";
  }

  return `${celsius.toFixed(precision)}°C`;
}
