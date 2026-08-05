export interface ChamberTemperature {
  low: number;
  high: number;
}

export const CHAMBER_TEMPERATURES: Record<string, ChamberTemperature> = {
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

export interface ChamberTempEvaluation {
  status: ChamberTempStatus;
  diff: number;
}

export function evaluateChamberTemperature(
  filamentType: string | null,
  temperature: number | undefined
): ChamberTempEvaluation | null {
  if (!filamentType || !temperature) {
    return null;
  }

  const chamberTemperature = CHAMBER_TEMPERATURES[filamentType.toUpperCase()];

  if (temperature < chamberTemperature.low) {
    return {
      status: "cold",
      diff: chamberTemperature.low - temperature,
    };
  }

  if (temperature >= chamberTemperature.high) {
    return {
      status: "critical",
      diff: temperature - chamberTemperature.high,
    };
  }

  if (temperature > chamberTemperature.high - 5) {
    return {
      status: "warning",
      diff: temperature - chamberTemperature.high + 5,
    };
  }

  return {
    status: "safe",
    diff: 0,
  };
}
