import { moonrakerUrl } from "@/lib/creality/config";
import { getPrinterHost } from "@/lib/settings/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
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
    const upstream = await fetch(
      moonrakerUrl(
        printerHost,
        `/server/files/gcodes/${encodeURIComponent(filename)}`,
      ),
      { cache: "no-store" },
    );

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Moonraker returned ${upstream.status}` },
        { status: upstream.ok ? 502 : upstream.status },
      );
    }

    // Stream the file straight through rather than buffering it in memory.
    return new Response(upstream.body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach printer";
    console.error(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
