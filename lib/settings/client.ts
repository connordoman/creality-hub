import type { AppSettings, UpdateAppSettingsRequest } from "./types";

export async function fetchAppSettings(): Promise<AppSettings> {
  const response = await fetch("/api/settings", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load settings (${response.status})`);
  }

  return (await response.json()) as AppSettings;
}

export async function updateAppSettings(
  settings: UpdateAppSettingsRequest,
): Promise<AppSettings> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? `Failed to save settings (${response.status})`);
  }

  return (await response.json()) as AppSettings;
}
