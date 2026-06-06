import { moonrakerUrl, MOONRAKER_PORT, PRINTER_HOST } from "@/lib/creality/config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("filename")?.trim();

  if (!filename) {
    return NextResponse.json(
      { error: "filename query parameter is required" },
      { status: 400 },
    );
  }

  const url = moonrakerUrl(
    PRINTER_HOST,
    `/server/files/metadata?filename=${encodeURIComponent(filename)}`,
  );

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 404) {
      return NextResponse.json(
        { error: "Metadata not available for file" },
        { status: 404 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Moonraker returned ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach printer";
    return NextResponse.json(
      {
        error: message,
        host: PRINTER_HOST,
        port: MOONRAKER_PORT,
      },
      { status: 502 },
    );
  }
}
