import { moonrakerUrl } from "@/lib/creality/config";
import {
  GCODE_ANALYSIS_CACHE_CONTROL,
  getCachedGcodeAnalysis,
  gcodeAnalysisCacheKey,
  setCachedGcodeAnalysis,
} from "@/lib/gcode/analysis-cache";
import {
  filamentTypeFromMetadata,
  gcodeBoundsFromMetadata,
  parseGcodeAnalysis,
  type GcodeAnalysis,
} from "@/lib/gcode/parse";
import { getPrinterHost } from "@/lib/settings/server";
import { NextRequest, NextResponse } from "next/server";

function jsonWithCache(body: GcodeAnalysis) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": GCODE_ANALYSIS_CACHE_CONTROL },
  });
}

async function fetchGcodeMetadata(printerHost: string, filename: string) {
  const url = moonrakerUrl(
    printerHost,
    `/server/files/metadata?filename=${encodeURIComponent(filename)}`
  );

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Moonraker metadata returned ${response.status}`);
  }

  const data = (await response.json()) as { result?: Record<string, unknown> };
  return data.result ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename) {
    return NextResponse.json(
      { error: "filename query parameter is required" },
      { status: 400 }
    );
  }

  if (!filename.endsWith(".gcode")) {
    return NextResponse.json(
      { error: "specified file is not a .gcode file" },
      { status: 400 }
    );
  }

  const printerHost = await getPrinterHost();

  try {
    const metadata = await fetchGcodeMetadata(printerHost, filename);
    const cacheKey = gcodeAnalysisCacheKey(printerHost, filename, metadata);
    const cached = getCachedGcodeAnalysis(cacheKey);
    if (cached) {
      return jsonWithCache(cached);
    }

    const gcodeUrl = moonrakerUrl(
      printerHost,
      `/server/files/gcodes/${encodeURIComponent(filename)}`
    );
    const gcodeResponse = await fetch(gcodeUrl, { cache: "no-store" });

    if (!gcodeResponse.ok) {
      return NextResponse.json(
        { error: `Moonraker returned ${gcodeResponse.status}` },
        { status: gcodeResponse.status }
      );
    }

    const gcode = await gcodeResponse.text();
    const metadataBounds = gcodeBoundsFromMetadata(metadata ?? undefined);
    const filamentType = filamentTypeFromMetadata(metadata ?? undefined);
    const analysis = parseGcodeAnalysis(gcode);

    const totalLayerCount = Math.max(
      analysis.totalLayerCount,
      metadataBounds.layerCount ?? 0
    );

    const result: GcodeAnalysis = {
      ...analysis,
      totalLayerCount,
      filamentType,
      bounds: {
        ...metadataBounds,
        layerCount: metadataBounds.layerCount ?? analysis.bounds.layerCount,
      },
    };

    setCachedGcodeAnalysis(cacheKey, result);
    return jsonWithCache(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach printer";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
