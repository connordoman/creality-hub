import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { AppSettings } from "./types";
import {
  DEFAULT_PRINTER_NAME,
  isValidPrinterHost,
  isValidPrinterName,
  normalizePrinterHost,
  normalizePrinterName,
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

function getDefaultSettings(): AppSettings {
  return {
    printerHost: getDefaultPrinterHost(),
    printerName: getDefaultPrinterName(),
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

    if (isValidPrinterHost(printerHost) && isValidPrinterName(printerName)) {
      return { printerHost, printerName };
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

  if (!isValidPrinterHost(printerHost)) {
    throw new Error("Invalid printer host");
  }

  if (!isValidPrinterName(printerName)) {
    throw new Error("Invalid printer name");
  }

  const normalized: AppSettings = { printerHost, printerName };
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
