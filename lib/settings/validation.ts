export const DEFAULT_PRINTER_NAME = "Creality K1C";
export const DEFAULT_MOTOR_STEP_SIZES = [1, 5, 10, 50] as const;
export const MAX_MOTOR_STEP_SIZES = 8;
export const MIN_MOTOR_STEP_SIZE_MM = 0.01;
export const MAX_MOTOR_STEP_SIZE_MM = 1000;

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
