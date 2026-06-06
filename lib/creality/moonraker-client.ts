import { deriveHeaterPhases } from "./heater-phase";
import type {
  HeaterPhases,
  HeaterReading,
  MoonrakerHeaterObject,
  MoonrakerHeaterQueryResponse,
  MoonrakerHistoryJob,
  MoonrakerHistoryResponse,
  MoonrakerMetadataResponse,
  PrintFileMetadata,
  PrintHistoryJob,
} from "./types";

function readMetadataNumber(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): number | null {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function normalizeJob(job: MoonrakerHistoryJob): PrintHistoryJob {
  const filamentUsedMm =
    job.filament_used ??
    job.filament_used_total ??
    readMetadataNumber(job.metadata, [
      "filament_used",
      "filament_used_total",
      "filament_total",
    ]);

  const filamentUsedG = readMetadataNumber(job.metadata, [
    "filament_weight_total",
    "filament_weight",
    "filament_total_weight",
  ]);

  return {
    id: job.job_id ?? job.filename ?? crypto.randomUUID(),
    filename: job.filename ?? "Unknown",
    status: job.status ?? "unknown",
    startTime: job.start_time ?? null,
    endTime: job.end_time ?? null,
    durationSeconds: job.print_duration ?? job.total_duration ?? null,
    filamentUsedMm,
    filamentUsedG,
  };
}

export interface PrintHistoryPage {
  jobs: PrintHistoryJob[];
  totalCount: number;
}

export async function fetchPrintHistoryPage({
  limit,
  start,
}: {
  limit: number;
  start: number;
}): Promise<PrintHistoryPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    start: String(start),
  });

  const response = await fetch(`/api/printer/history?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch print history (${response.status})`);
  }

  const data = (await response.json()) as MoonrakerHistoryResponse;
  const jobs = data.result?.jobs ?? [];
  const totalCount =
    data.result?.total_jobs ??
    data.result?.count ??
    jobs.length;

  return {
    jobs: jobs.map(normalizeJob),
    totalCount,
  };
}

/** @deprecated Use fetchPrintHistoryPage for paginated history. */
export async function fetchPrintHistory(
  limit = 50,
): Promise<PrintHistoryJob[]> {
  const page = await fetchPrintHistoryPage({ limit, start: 0 });
  return page.jobs;
}

function normalizeHeaterReading(
  heater?: MoonrakerHeaterObject,
): HeaterReading {
  return {
    temperature:
      typeof heater?.temperature === "number" ? heater.temperature : null,
    target: typeof heater?.target === "number" ? heater.target : null,
    power: typeof heater?.power === "number" ? heater.power : null,
  };
}

function normalizePrintMetadata(
  metadata: Record<string, unknown> | undefined,
): PrintFileMetadata {
  return {
    filamentTotalMm: readMetadataNumber(metadata, [
      "filament_total",
      "filament_used_total",
    ]),
    filamentTotalG: readMetadataNumber(metadata, [
      "filament_weight_total",
      "filament_weight",
      "filament_total_weight",
    ]),
    estimatedTimeSeconds: readMetadataNumber(metadata, ["estimated_time"]),
    printStartTime: readMetadataNumber(metadata, ["print_start_time"]),
  };
}

export async function fetchPrintMetadata(
  filename: string,
): Promise<PrintFileMetadata | null> {
  const params = new URLSearchParams({ filename });
  const response = await fetch(`/api/printer/metadata?${params.toString()}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch print metadata (${response.status})`);
  }

  const data = (await response.json()) as MoonrakerMetadataResponse;
  return normalizePrintMetadata(data.result);
}

export async function fetchHeaterPhases(): Promise<HeaterPhases> {
  const response = await fetch("/api/printer/heaters");

  if (!response.ok) {
    throw new Error(`Failed to fetch heater state (${response.status})`);
  }

  const data = (await response.json()) as MoonrakerHeaterQueryResponse;
  const status = data.result?.status;

  return deriveHeaterPhases({
    nozzle: normalizeHeaterReading(status?.extruder),
    bed: normalizeHeaterReading(status?.heater_bed),
  });
}
