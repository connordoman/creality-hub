import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { AppSettings } from "./types";
import { isValidPrinterHost, normalizePrinterHost } from "./validation";

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

function getDefaultSettings(): AppSettings {
  return { printerHost: getDefaultPrinterHost() };
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const printerHost = normalizePrinterHost(parsed.printerHost ?? "");

    if (isValidPrinterHost(printerHost)) {
      return { printerHost };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to read settings file:", error);
    }
  }

  return getDefaultSettings();
}

export async function writeSettings(settings: AppSettings): Promise<AppSettings> {
  const printerHost = normalizePrinterHost(settings.printerHost);

  if (!isValidPrinterHost(printerHost)) {
    throw new Error("Invalid printer host");
  }

  const normalized: AppSettings = { printerHost };
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
