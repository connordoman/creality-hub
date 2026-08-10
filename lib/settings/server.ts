import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { AppSettings } from "./types";
import {
  DEFAULT_BUILD_VOLUME,
  DEFAULT_MOTOR_STEP_SIZES,
  DEFAULT_PRINTER_NAME,
  isValidBuildVolume,
  isValidMotorStepSizes,
  isValidPrinterHost,
  isValidPrinterName,
  normalizeBuildVolume,
  normalizeMotorStepSizes,
  normalizePrinterHost,
  normalizePrinterName,
  parseBuildVolumeDimension,
  parseMotorStepSizes,
} from "./validation";

const SETTINGS_FILENAME = "settings.json";

export function getDefaultPrinterHost(): string {
  return (
    process.env.PRINTER_HOST ??
    process.env.NEXT_PUBLIC_PRINTER_HOST ??
    "10.0.0.184"
  );
}

export function getDataDir(): string {
  return process.env.CREALITY_HUB_DATA_DIR ?? path.join(process.cwd(), "data");
}

export function getSettingsPath(): string {
  return path.join(getDataDir(), SETTINGS_FILENAME);
}

function getDefaultPrinterName(): string {
  return DEFAULT_PRINTER_NAME;
}

function getDefaultMotorStepSizes(): number[] {
  const fromEnv =
    process.env.MOTOR_STEP_SIZES ?? process.env.NEXT_PUBLIC_MOTOR_STEP_SIZES;

  if (fromEnv) {
    const parsed = normalizeMotorStepSizes(parseMotorStepSizes(fromEnv));

    if (isValidMotorStepSizes(parsed)) {
      return parsed;
    }
  }

  return [...DEFAULT_MOTOR_STEP_SIZES];
}

function parseEnvBuildVolumeDimension(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  return parseBuildVolumeDimension(value) ?? fallback;
}

function getDefaultBuildVolume() {
  const volume = {
    x: parseEnvBuildVolumeDimension(
      process.env.BUILD_VOLUME_X ?? process.env.NEXT_PUBLIC_BUILD_VOLUME_X,
      DEFAULT_BUILD_VOLUME.x,
    ),
    y: parseEnvBuildVolumeDimension(
      process.env.BUILD_VOLUME_Y ?? process.env.NEXT_PUBLIC_BUILD_VOLUME_Y,
      DEFAULT_BUILD_VOLUME.y,
    ),
    z: parseEnvBuildVolumeDimension(
      process.env.BUILD_VOLUME_Z ?? process.env.NEXT_PUBLIC_BUILD_VOLUME_Z,
      DEFAULT_BUILD_VOLUME.z,
    ),
  };

  return isValidBuildVolume(volume) ? volume : { ...DEFAULT_BUILD_VOLUME };
}

function getDefaultSettings(): AppSettings {
  return {
    printerHost: getDefaultPrinterHost(),
    printerName: getDefaultPrinterName(),
    motorStepSizes: getDefaultMotorStepSizes(),
    buildVolume: getDefaultBuildVolume(),
  };
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const defaults = getDefaultSettings();
    const printerHost = normalizePrinterHost(parsed.printerHost ?? "");
    const printerName = normalizePrinterName(
      parsed.printerName ?? defaults.printerName,
    );

    const motorStepSizesRaw = parsed.motorStepSizes ?? defaults.motorStepSizes;
    const motorStepSizes = isValidMotorStepSizes(motorStepSizesRaw)
      ? normalizeMotorStepSizes(motorStepSizesRaw)
      : defaults.motorStepSizes;
    const buildVolume = isValidBuildVolume(parsed.buildVolume)
      ? normalizeBuildVolume(parsed.buildVolume)
      : defaults.buildVolume;

    if (isValidPrinterHost(printerHost) && isValidPrinterName(printerName)) {
      return { printerHost, printerName, motorStepSizes, buildVolume };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to read settings file:", error);
    }
  }

  return getDefaultSettings();
}

export async function writeSettings(
  updates: Partial<AppSettings>,
): Promise<AppSettings> {
  const existing = await readSettings();
  const printerHost = normalizePrinterHost(
    updates.printerHost ?? existing.printerHost,
  );
  const printerName = normalizePrinterName(
    updates.printerName ?? existing.printerName,
  );
  const motorStepSizes = normalizeMotorStepSizes(
    updates.motorStepSizes ?? existing.motorStepSizes,
  );
  const buildVolume = normalizeBuildVolume(
    updates.buildVolume ?? existing.buildVolume,
  );

  if (!isValidPrinterHost(printerHost)) {
    throw new Error("Invalid printer host");
  }

  if (!isValidPrinterName(printerName)) {
    throw new Error("Invalid printer name");
  }

  if (!isValidMotorStepSizes(motorStepSizes)) {
    throw new Error("Invalid motor step sizes");
  }

  if (!isValidBuildVolume(buildVolume)) {
    throw new Error("Invalid build volume");
  }

  const normalized: AppSettings = {
    printerHost,
    printerName,
    motorStepSizes,
    buildVolume,
  };
  const dataDir = getDataDir();
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    getSettingsPath(),
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );

  return normalized;
}

export async function getPrinterHost(): Promise<string> {
  const settings = await readSettings();
  return settings.printerHost;
}
