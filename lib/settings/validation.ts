export const DEFAULT_PRINTER_NAME = "Creality K1C";
export const DEFAULT_MOTOR_STEP_SIZES = [1, 5, 10, 50] as const;
export const DEFAULT_BUILD_VOLUME = { x: 220, y: 220, z: 250 } as const;
export const MAX_MOTOR_STEP_SIZES = 8;
export const MIN_MOTOR_STEP_SIZE_MM = 0.01;
export const MAX_MOTOR_STEP_SIZE_MM = 1000;
export const MIN_BUILD_VOLUME_MM = 1;
export const MAX_BUILD_VOLUME_MM = 10000;

export function normalizePrinterHost(value: string): string {
  return value.trim();
}

export function normalizePrinterName(value: string): string {
  return value.trim();
}

export function isValidPrinterName(name: string): boolean {
  const normalized = normalizePrinterName(name);

  return normalized.length > 0 && normalized.length <= 100;
}

export function parseMotorStepSizes(value: string | readonly number[]): number[] {
  const rawValues =
    typeof value === "string"
      ? value.split(",").map((part) => part.trim())
      : value.map(String);

  const parsed: number[] = [];

  for (const part of rawValues) {
    if (!part) {
      continue;
    }

    const number = Number(part);

    if (Number.isFinite(number)) {
      parsed.push(number);
    }
  }

  return parsed;
}

export function normalizeMotorStepSizes(sizes: readonly number[]): number[] {
  const normalized: number[] = [];

  for (const size of sizes) {
    if (!isMotorStepSize(size)) {
      continue;
    }

    if (!normalized.includes(size)) {
      normalized.push(size);
    }
  }

  return normalized;
}

function isMotorStepSize(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_MOTOR_STEP_SIZE_MM &&
    value <= MAX_MOTOR_STEP_SIZE_MM
  );
}

export function isValidMotorStepSizes(sizes: unknown): sizes is number[] {
  if (!Array.isArray(sizes)) {
    return false;
  }

  if (sizes.length === 0 || sizes.length > MAX_MOTOR_STEP_SIZES) {
    return false;
  }

  return sizes.every(isMotorStepSize);
}

export function formatMotorStepSizes(sizes: readonly number[]): string {
  return sizes.join(", ");
}

function isBuildVolumeDimension(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_BUILD_VOLUME_MM &&
    value <= MAX_BUILD_VOLUME_MM
  );
}

export function parseBuildVolumeDimension(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return isBuildVolumeDimension(parsed) ? parsed : null;
}

export function normalizeBuildVolume(
  volume: Partial<{ x: unknown; y: unknown; z: unknown }>,
  defaults: { x: number; y: number; z: number } = DEFAULT_BUILD_VOLUME,
): { x: number; y: number; z: number } {
  const normalizeAxis = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && isBuildVolumeDimension(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = parseBuildVolumeDimension(value);
      if (parsed !== null) {
        return parsed;
      }
    }

    return fallback;
  };

  return {
    x: normalizeAxis(volume.x, defaults.x),
    y: normalizeAxis(volume.y, defaults.y),
    z: normalizeAxis(volume.z, defaults.z),
  };
}

export function isValidBuildVolume(
  volume: unknown,
): volume is { x: number; y: number; z: number } {
  if (typeof volume !== "object" || volume === null) {
    return false;
  }

  const candidate = volume as Partial<{ x: unknown; y: unknown; z: unknown }>;

  return (
    isBuildVolumeDimension(candidate.x as number) &&
    isBuildVolumeDimension(candidate.y as number) &&
    isBuildVolumeDimension(candidate.z as number)
  );
}

export function isValidPrinterHost(host: string): boolean {
  const normalized = normalizePrinterHost(host);

  if (!normalized || normalized.length > 253) {
    return false;
  }

  // IPv4
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(normalized)) {
    return normalized.split(".").every((part) => {
      const octet = Number(part);
      return Number.isInteger(octet) && octet >= 0 && octet <= 255;
    });
  }

  // Hostname / mDNS
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
    normalized,
  );
}
