import { isPaused } from "./status";
import type { PrinterCommand, PrinterTelemetry } from "./types";

export interface PrinterCommandMutationConfig<TVariables = void> {
  mutationKey: string;
  getCommand: (variables: TVariables) => PrinterCommand;
  getOptimisticTelemetry: (
    variables: TVariables,
    telemetry: PrinterTelemetry,
  ) => Partial<PrinterTelemetry>;
  isConfirmed: (
    telemetry: PrinterTelemetry,
    variables: TVariables,
  ) => boolean;
  confirmationTimeoutMs?: number;
}

export const chamberLightCommand: PrinterCommandMutationConfig<boolean> = {
  mutationKey: "chamber-light",
  getCommand: (enabled) => (enabled ? "light-on" : "light-off"),
  getOptimisticTelemetry: (enabled) => ({
    lightSw: enabled ? 1 : 0,
  }),
  isConfirmed: (telemetry, enabled) => isChamberLightOn(telemetry) === enabled,
};

export function isChamberLightOn(telemetry: PrinterTelemetry): boolean {
  return Number(telemetry.lightSw) === 1;
}

export function getChamberLightDisplayState(
  telemetry: PrinterTelemetry,
  pendingTarget: boolean | undefined,
): boolean {
  if (pendingTarget !== undefined) {
    return pendingTarget;
  }

  return isChamberLightOn(telemetry);
}

export const pausePrintCommand: PrinterCommandMutationConfig<void> = {
  mutationKey: "pause-print",
  getCommand: () => "pause",
  getOptimisticTelemetry: () => ({
    pause: 1,
    paused: 1,
    isPaused: 1,
    state: 5,
  }),
  isConfirmed: (telemetry) => isPaused(telemetry) || telemetry.state === 5,
};

export const resumePrintCommand: PrinterCommandMutationConfig<void> = {
  mutationKey: "resume-print",
  getCommand: () => "resume",
  getOptimisticTelemetry: (_variables, telemetry) => ({
    pause: 0,
    paused: 0,
    isPaused: 0,
    state: telemetry.state === 5 ? 1 : telemetry.state,
  }),
  isConfirmed: (telemetry) => !isPaused(telemetry) && telemetry.state !== 5,
};

export const stopPrintCommand: PrinterCommandMutationConfig<void> = {
  mutationKey: "stop-print",
  getCommand: () => "stop",
  getOptimisticTelemetry: () => ({
    state: 4,
  }),
  isConfirmed: (telemetry) => telemetry.state === 4,
};
