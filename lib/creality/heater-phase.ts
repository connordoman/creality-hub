import type { HeaterPhase, HeaterPhases, HeaterReading } from "./types";

export const HEATER_HYSTERESIS_C = 3;
export const HEATER_POWER_THRESHOLD = 0.05;
/** Targets below this are treated as off / idle. */
export const HEATER_MIN_TARGET_C = 30;

export function deriveHeaterPhase({
  temperature,
  target,
  power,
}: HeaterReading): HeaterPhase {
  if (
    temperature === null ||
    target === null ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(target)
  ) {
    return "static";
  }

  const heaterPower = power ?? 0;
  const delta = target - temperature;

  if (target < HEATER_MIN_TARGET_C || target === null) {
    if (
      temperature > (target ?? 0) + HEATER_HYSTERESIS_C &&
      heaterPower <= HEATER_POWER_THRESHOLD
    ) {
      return "cooling";
    }
    return "static";
  }

  if (heaterPower > HEATER_POWER_THRESHOLD && delta > HEATER_HYSTERESIS_C) {
    return "heating";
  }

  if (delta < -HEATER_HYSTERESIS_C) {
    return heaterPower > HEATER_POWER_THRESHOLD ? "static" : "cooling";
  }

  return "static";
}

export function deriveHeaterPhases(readings: {
  nozzle: HeaterReading;
  bed: HeaterReading;
}): HeaterPhases {
  return {
    nozzle: deriveHeaterPhase(readings.nozzle),
    bed: deriveHeaterPhase(readings.bed),
  };
}
