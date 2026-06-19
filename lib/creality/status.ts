import type { PrintFileMetadata, PrintStatus, PrinterTelemetry } from "./types";

const ACTIVE_PRINT_STATUSES: PrintStatus[] = [
  "processing",
  "printing",
  "paused",
];

function readUnixTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return null;
}

export function isActivePrintStatus(status: PrintStatus): boolean {
  return ACTIVE_PRINT_STATUSES.includes(status);
}

export function getPrintStartTime(
  telemetry: PrinterTelemetry,
  metadata: PrintFileMetadata | null | undefined,
  elapsedSeconds: number,
  status: PrintStatus
): number | null {
  const fromMetadata = metadata?.printStartTime;
  if (fromMetadata != null) {
    return fromMetadata;
  }

  const fromTelemetry = readUnixTimestamp(telemetry.printStartTime);
  if (fromTelemetry != null) {
    return fromTelemetry;
  }

  if (isActivePrintStatus(status) && elapsedSeconds > 0) {
    return Math.floor(Date.now() / 1000) - elapsedSeconds;
  }

  return null;
}

export function getExpectedCompletionTime(
  startTime: number | null,
  elapsedSeconds: number,
  remainingSeconds: number,
  estimatedTimeSeconds: number | null,
  status: PrintStatus
): number | null {
  if (startTime == null) {
    if (isActivePrintStatus(status) && remainingSeconds > 0) {
      return Math.floor(Date.now() / 1000) + remainingSeconds;
    }

    return null;
  }

  const liveTotal = elapsedSeconds + remainingSeconds;
  if (isActivePrintStatus(status) && liveTotal > 0) {
    return startTime + liveTotal;
  }

  if (estimatedTimeSeconds != null && estimatedTimeSeconds > 0) {
    return startTime + estimatedTimeSeconds;
  }

  if (status === "completed" && elapsedSeconds > 0) {
    return startTime + elapsedSeconds;
  }

  return null;
}

export function coerceNumbers(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
        out[key] = trimmed.includes(".")
          ? parseFloat(trimmed)
          : parseInt(trimmed, 10);
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

export function getProgress(data: PrinterTelemetry): number | null {
  const raw = data.printProgress ?? data.dProgress;
  if (raw === undefined || raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function isPaused(data: PrinterTelemetry): boolean {
  return (
    data.state === 5 ||
    data.pause === 1 ||
    data.paused === 1 ||
    data.isPaused === 1
  );
}

export function derivePrintStatus(
  data: PrinterTelemetry | null,
  connected: boolean
): PrintStatus {
  if (!connected) return "disconnected";
  if (!data) return "idle";

  const errCode = data.err?.errcode ?? 0;
  if (errCode !== 0) return "error";

  const selfTest = data.withSelfTest ?? 0;
  if (selfTest >= 1 && selfTest <= 99) return "self-testing";

  const filename = (data.printFileName ?? "").trim();
  const progress = getProgress(data);
  const state = data.state;

  if (filename) {
    if (progress !== null && progress >= 100) return "completed";
    if (state === 5 || isPaused(data)) return "paused";
    if (state === 4) return "stopped";
    if (state === 1) return "printing";
    if (state === 0) return "processing";
  }

  return "idle";
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "--:--:--";
  }

  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

interface Measure {
  value: number | null | undefined;
  unit: string;
}

interface FilamentUsed {
  length: Measure | null;
  weight: Measure | null;
}

export function formatFilamentUsed(
  mm: number | null | undefined,
  grams: number | null | undefined
): FilamentUsed {
  const filamentUsed: FilamentUsed = {
    length: null,
    weight: null,
  };

  if (mm !== null && mm !== undefined && Number.isFinite(mm) && mm > 0) {
    if (mm >= 1000) {
      filamentUsed.length = {
        value: mm / 1000,
        unit: "m",
      };
    } else {
      filamentUsed.length = {
        value: mm,
        unit: "mm",
      };
    }
  }

  if (
    grams !== null &&
    grams !== undefined &&
    Number.isFinite(grams) &&
    grams > 0
  ) {
    if (grams >= 1000) {
      filamentUsed.weight = {
        value: grams / 1000,
        unit: "kg",
      };
    } else {
      filamentUsed.weight = {
        value: grams,
        unit: "g",
      };
    }
  }

  return filamentUsed;
}

export function formatTemperature(
  value: number | null | undefined,
  target?: number | null
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  const current = `${value.toFixed(1)}°C`;
  if (target !== null && target !== undefined && Number.isFinite(target)) {
    return `${current} / ${target.toFixed(0)}°C`;
  }

  return current;
}
