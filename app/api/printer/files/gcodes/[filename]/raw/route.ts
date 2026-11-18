import { moonrakerUrl } from "@/lib/creality/config";
import {
  fetchGcodeMetadata,
  GcodeFetchError,
  gcodeFileEtag,
  gcodeFileVersion,
  getCachedGcodeFile,
  openCachedGcodeGzip,
  openCachedGcodePlain,
} from "@/lib/gcode/file-cache";
import { getPrinterHost } from "@/lib/settings/server";
import { NextRequest, NextResponse } from "next/server";

function etagMatches(header: string | null, etag: string): boolean {
  if (!header) {
    return false;
  }
  return header
    .split(",")
    .map((value) => value.trim().replace(/^W\//, ""))
    .some((value) => value === etag || value === "*");
}

/** Uncached passthrough, for files Moonraker has no version metadata for. */
async function streamFromPrinter(printerHost: string, filename: string) {
  const upstream = await fetch(
    moonrakerUrl(printerHost, `/server/files/gcodes/${encodeURIComponent(filename)}`),
    { cache: "no-store" },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Moonraker returned ${upstream.status}` },
      { status: upstream.ok ? 502 : upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!filename?.endsWith(".gcode")) {
    return NextResponse.json(
      { error: "specified file is not a .gcode file" },
      { status: 400 },
    );
  }

  try {
    const printerHost = await getPrinterHost();
    const metadata = await fetchGcodeMetadata(printerHost, filename);
    const version = gcodeFileVersion(printerHost, filename, metadata);
    if (!version) {
      return streamFromPrinter(printerHost, filename);
    }

    const etag = gcodeFileEtag(version);
    const cacheHeaders = {
      ETag: etag,
      // Always revalidate: the URL is not versioned, but a match costs one
      // metadata lookup and an empty 304.
      "Cache-Control": "private, no-cache",
      Vary: "Accept-Encoding",
    };

    if (etagMatches(request.headers.get("if-none-match"), etag)) {
      return new Response(null, { status: 304, headers: cacheHeaders });
    }

    const file = await getCachedGcodeFile(version);
    const acceptsGzip = /\bgzip\b/i.test(
      request.headers.get("accept-encoding") ?? "",
    );

    if (acceptsGzip) {
      // Gcode compresses ~4x; send the stored gzip bytes as they are.
      const { stream, size } = await openCachedGcodeGzip(file);
      return new Response(stream, {
        headers: {
          ...cacheHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Encoding": "gzip",
          "Content-Length": String(size),
        },
      });
    }

    return new Response(openCachedGcodePlain(file), {
      headers: {
        ...cacheHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof GcodeFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to reach printer";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
