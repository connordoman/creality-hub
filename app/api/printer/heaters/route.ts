import { moonrakerUrl, MOONRAKER_PORT, PRINTER_HOST } from "@/lib/creality/config";
import { NextResponse } from "next/server";

export async function GET() {
  const url = moonrakerUrl(
    PRINTER_HOST,
    "/printer/objects/query?extruder=temperature,target,power&heater_bed=temperature,target,power",
  );

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

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
