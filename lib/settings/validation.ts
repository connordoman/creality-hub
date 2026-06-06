export function normalizePrinterHost(value: string): string {
  return value.trim();
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
