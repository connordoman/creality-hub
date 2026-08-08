import type { GcodeAnalysis } from "@/lib/gcode/parse";

const cache = new Map<string, GcodeAnalysis>();

export function gcodeAnalysisCacheKey(
  printerHost: string,
  filename: string,
  metadata: Record<string, unknown> | null
): string {
  const size = metadata?.size ?? metadata?.file_size ?? "";
  const modified = metadata?.modified ?? "";
  return `${printerHost}\0${filename}\0${size}:${modified}`;
}

export function getCachedGcodeAnalysis(
  key: string
): GcodeAnalysis | undefined {
  return cache.get(key);
}

export function setCachedGcodeAnalysis(
  key: string,
  analysis: GcodeAnalysis
): void {
  cache.set(key, analysis);
}

export const GCODE_ANALYSIS_CACHE_CONTROL =
  "public, max-age=31536000, immutable";
