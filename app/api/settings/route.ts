import {
  getDataDir,
  readSettings,
  writeSettings,
} from "@/lib/settings/server";
import {
  isValidMotorStepSizes,
  isValidPrinterHost,
  isValidPrinterName,
  normalizeMotorStepSizes,
  normalizePrinterHost,
  normalizePrinterName,
  parseMotorStepSizes,
} from "@/lib/settings/validation";
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

  if (body.printerHost !== undefined) {
    const printerHost = normalizePrinterHost(body.printerHost);

    if (!isValidPrinterHost(printerHost)) {
      return NextResponse.json(
        { error: "Enter a valid IPv4 address or hostname" },
        { status: 400 },
      );
    }
  }

  if (body.printerName !== undefined) {
    const printerName = normalizePrinterName(body.printerName);

    if (!isValidPrinterName(printerName)) {
      return NextResponse.json(
        { error: "Enter a printer name (1-100 characters)" },
        { status: 400 },
      );
    }
  }

  if (body.motorStepSizes !== undefined) {
    const motorStepSizes = normalizeMotorStepSizes(
      typeof body.motorStepSizes === "string"
        ? parseMotorStepSizes(body.motorStepSizes)
        : body.motorStepSizes,
    );

    if (!isValidMotorStepSizes(motorStepSizes)) {
      return NextResponse.json(
        {
          error:
            "Enter 1-8 comma-separated step sizes between 0.01 and 1000 mm",
        },
        { status: 400 },
      );
    }
  }

  if (
    body.printerHost === undefined &&
    body.printerName === undefined &&
    body.motorStepSizes === undefined
  ) {
    return NextResponse.json(
      { error: "No settings to update" },
      { status: 400 },
    );
  }

  try {
    const settings = await writeSettings(body);
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
