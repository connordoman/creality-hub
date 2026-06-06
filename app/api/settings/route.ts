import {
  getDataDir,
  readSettings,
  writeSettings,
} from "@/lib/settings/server";
import { isValidPrinterHost, normalizePrinterHost } from "@/lib/settings/validation";
import type { UpdateAppSettingsRequest } from "@/lib/settings/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: UpdateAppSettingsRequest;

  try {
    body = (await request.json()) as UpdateAppSettingsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const printerHost = normalizePrinterHost(body.printerHost ?? "");

  if (!isValidPrinterHost(printerHost)) {
    return NextResponse.json(
      { error: "Enter a valid IPv4 address or hostname" },
      { status: 400 },
    );
  }

  try {
    const settings = await writeSettings({ printerHost });
    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json(
      {
        error: message,
        dataDir: getDataDir(),
      },
      { status: 500 },
    );
  }
}
