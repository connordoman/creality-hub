import {
  GCODE_ANALYSIS_CACHE_CONTROL,
  getCachedGcodeAnalysis,
  gcodeAnalysisCacheKey,
  setCachedGcodeAnalysis,
} from "@/lib/gcode/analysis-cache";
import {
  fetchGcodeMetadata,
  GcodeFetchError,
  gcodeFileVersion,
  getCachedGcodeFile,
  readCachedGcodeText,
} from "@/lib/gcode/file-cache";
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

    const version = gcodeFileVersion(printerHost, filename, metadata);
    if (!version) {
      return NextResponse.json(
        { error: "gcode file not found on printer" },
        { status: 404 },
      );
    }

    // Shares the download with the /raw route, which the viewer requests at
    // the same time.
    const gcode = await readCachedGcodeText(await getCachedGcodeFile(version));
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
    if (error instanceof GcodeFetchError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to reach printer";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
