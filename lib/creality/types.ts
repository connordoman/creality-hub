export type PrintStatus =
  | "idle"
  | "processing"
  | "printing"
  | "paused"
  | "stopped"
  | "completed"
  | "error"
  | "self-testing"
  | "disconnected";

export type PrinterCommand =
  | "pause"
  | "resume"
  | "stop"
  | "light-on"
  | "light-off";

export type HeaterPhase = "heating" | "cooling" | "static";

export interface HeaterReading {
  temperature: number | null;
  target: number | null;
  power: number | null;
}

export interface HeaterPhases {
  nozzle: HeaterPhase;
  bed: HeaterPhase;
  raw?: {
    nozzle: HeaterReading | undefined;
    bed: HeaterReading | undefined;
  };
}

export interface MoonrakerHeaterObject {
  temperature?: number;
  target?: number;
  power?: number;
}

export interface MoonrakerHeaterQueryResponse {
  result?: {
    status?: {
      extruder?: MoonrakerHeaterObject;
      heater_bed?: MoonrakerHeaterObject;
    };
  };
}

export interface PrinterError {
  errcode?: number;
  key?: number;
}

export interface PrinterTelemetry {
  nozzleTemp?: number;
  targetNozzleTemp?: number;
  bedTemp0?: number;
  targetBedTemp0?: number;
  boxTemp?: number;
  targetBoxTemp?: number;
  printProgress?: number;
  dProgress?: number;
  printJobTime?: number;
  printLeftTime?: number;
  printStartTime?: number;
  printFileName?: string;
  lightSw?: number;
  state?: number;
  deviceState?: number;
  withSelfTest?: number;
  pause?: number;
  paused?: number;
  isPaused?: number;
  err?: PrinterError;
  model?: string;
  modelVersion?: string;
  webrtcSupport?: number;
  curPosition?: string;
  autohome?: string;
  [key: string]: unknown;
}

export interface PrintHistoryJob {
  id: string;
  filename: string;
  status: string;
  startTime: number | null;
  endTime: number | null;
  durationSeconds: number | null;
  /** Filament length used during the print, in millimeters. */
  filamentUsedMm: number | null;
  /** Filament weight used during the print, in grams (when reported by Moonraker). */
  filamentUsedG: number | null;
}

export interface PrintFileMetadata {
  /** Total filament length for the job, in millimeters. */
  filamentTotalMm: number | null;
  /** Total filament weight for the job, in grams. */
  filamentTotalG: number | null;
  /** Slicer-estimated print duration, in seconds. */
  estimatedTimeSeconds: number | null;
  /** Unix timestamp when the current print job started. */
  printStartTime: number | null;
}

export interface MoonrakerMetadataResponse {
  result?: Record<string, unknown>;
}

export interface MoonrakerHistoryResponse {
  result?: {
    jobs?: MoonrakerHistoryJob[];
    /** Number of jobs in the current page only. */
    count?: number;
    /** Total jobs tracked by Moonraker (from /server/history/totals). */
    total_jobs?: number;
  };
}

export interface MoonrakerHistoryJob {
  job_id?: string;
  filename?: string;
  status?: string;
  start_time?: number;
  end_time?: number;
  print_duration?: number;
  total_duration?: number;
  filament_used?: number;
  filament_used_total?: number;
  metadata?: Record<string, unknown>;
}
