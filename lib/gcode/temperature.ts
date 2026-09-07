export const FILAMENT_TYPES = [
  "PLA",
  "TPU",
  "PETG",
  "PCTG",
  "ABS",
  "ASA",
] as const;

export type FilamentType = (typeof FILAMENT_TYPES)[number];

export interface ChamberTemperature {
  low: number;
  high: number;
}

export const CHAMBER_TEMPERATURES: Record<FilamentType, ChamberTemperature> = {
  PLA: {
    low: 15,
    high: 40,
  },
  TPU: {
    low: 15,
    high: 45,
  },
  PETG: {
    low: 15,
    high: 50,
  },
  PCTG: {
    low: 20,
    high: 60,
  },
  ABS: {
    low: 25,
    high: 60,
  },
  ASA: {
    low: 25,
    high: 60,
  },
} as const;

export type ChamberTempStatus = "cold" | "safe" | "warning" | "critical";

export const CHAMBER_TEMPERATURE_WARNING_DELTA = 5;

export interface ChamberTempEvaluation {
  status: ChamberTempStatus;
  diff: number;
  filamentType: FilamentType | FilamentType[] | null;
  chamberTemperature: ChamberTemperature;
}

export function evaluateChamberTemperature(
  filamentType: FilamentType | FilamentType[] | null,
  temperature: number | undefined,
): ChamberTempEvaluation | null {
  if (
    !filamentType ||
    !temperature ||
    (Array.isArray(filamentType) && filamentType.length === 0)
  ) {
    return null;
  }

  const filamentTypes = Array.isArray(filamentType)
    ? filamentType
    : [filamentType];

  const chamberTemperature: ChamberTemperature = {
    low: Math.max(...filamentTypes.map((type) => CHAMBER_TEMPERATURES[type].low)),
    high: Math.min(...filamentTypes.map((type) => CHAMBER_TEMPERATURES[type].high)),
  };

  if (temperature < chamberTemperature.low) {
    return {
      status: "cold",
      diff: chamberTemperature.low - temperature,
      filamentType,
      chamberTemperature,
    };
  }

  if (temperature >= chamberTemperature.high) {
    return {
      status: "critical",
      diff:
        temperature -
        chamberTemperature.high +
        CHAMBER_TEMPERATURE_WARNING_DELTA,
      filamentType,
      chamberTemperature,
    };
  }

  if (
    temperature >
    chamberTemperature.high - CHAMBER_TEMPERATURE_WARNING_DELTA
  ) {
    return {
      status: "warning",
      diff:
        temperature -
        chamberTemperature.high +
        CHAMBER_TEMPERATURE_WARNING_DELTA,
      filamentType,
      chamberTemperature,
    };
  }

  return {
    status: "safe",
    diff: 0,
    filamentType,
    chamberTemperature,
  };
}
