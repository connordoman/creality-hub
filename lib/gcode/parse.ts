export type PauseProgressMethod = "executable-bytes" | "bytes" | "layer";

export interface GcodeAnalysisBounds {
  gcodeStartByte: number | null;
  gcodeEndByte: number | null;
  layerCount: number | null;
}

export interface PrintPause {
  percentage: number;
  layer: number | null;
  line: number;
  method: PauseProgressMethod;
}

export interface GcodeAnalysis {
  pauses: PrintPause[];
  bounds: GcodeAnalysisBounds;
  totalLayerCount: number;
  totalLineCount: number;
  filamentType: string | string[] | null;
}

const PAUSE_LINE_RE = /^\s*PAUSE(?:\s|;|$)/i;

function readBoundsNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return null;
}

export function gcodeBoundsFromMetadata(
  metadata: Record<string, unknown> | undefined
): GcodeAnalysisBounds {
  return {
    gcodeStartByte: readBoundsNumber(metadata?.gcode_start_byte),
    gcodeEndByte: readBoundsNumber(metadata?.gcode_end_byte),
    layerCount: readBoundsNumber(metadata?.layer_count),
  };
}

export function filamentTypeFromMetadata(
  metadata: Record<string, unknown> | undefined
): string | string[] | null {
  const value = metadata?.filament_type;
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        return parsed;
      }
    } catch {
      // Fall through to scalar handling.
    }
  }

  if (value.includes(";")) {
    return value
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}

function parseLayerFromLine(line: string): number | null {
  const layerComment = line.match(/;LAYER:(\d+)/i);
  if (layerComment) {
    return Number(layerComment[1]);
  }

  const layerLabel = line.match(/;\s*layer\s+(\d+)/i);
  if (layerLabel) {
    return Number(layerLabel[1]);
  }

  return null;
}

function isLayerChangeLine(line: string): boolean {
  return /;LAYER_CHANGE/i.test(line);
}

function isPauseLine(line: string): boolean {
  return PAUSE_LINE_RE.test(line.trim());
}

function percentFromBytes(
  pauseByte: number,
  fileSize: number
): { percentage: number; method: PauseProgressMethod } {
  if (fileSize <= 0) {
    return { percentage: 0, method: "bytes" };
  }

  return {
    percentage: (pauseByte / fileSize) * 100,
    method: "bytes",
  };
}

function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseGcodeAnalysis(gcode: string): GcodeAnalysis {
  const lines = gcode.split("\n");
  const pauses: PrintPause[] = [];

  let byteOffset = 0;
  let currentLayer: number | null = null;
  let maxLayerNumber = 0;
  let layerChangeCount = 0;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;

    const explicitLayer = parseLayerFromLine(line);
    if (explicitLayer != null) {
      currentLayer = explicitLayer;
      maxLayerNumber = Math.max(maxLayerNumber, explicitLayer);
    } else if (isLayerChangeLine(line)) {
      layerChangeCount++;
      currentLayer = layerChangeCount;
      maxLayerNumber = Math.max(maxLayerNumber, layerChangeCount);
    }

    if (isPauseLine(line)) {
      const byteProgress = percentFromBytes(byteOffset, gcode.length);
      pauses.push({
        percentage: roundPercentage(byteProgress.percentage),
        layer: currentLayer,
        line: lineNumber,
        method: byteProgress.method,
      });
    }

    byteOffset += line.length + 1;
  }

  const totalLayerCount =
    maxLayerNumber > 0 ? maxLayerNumber : layerChangeCount;

  return {
    pauses,
    bounds: {
      gcodeStartByte: null,
      gcodeEndByte: null,
      layerCount: totalLayerCount > 0 ? totalLayerCount : null,
    },
    totalLayerCount,
    totalLineCount: lines.length,
    filamentType: null,
  };
}
