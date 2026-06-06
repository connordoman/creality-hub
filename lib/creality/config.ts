export const WS_PORT = 9999;
export const MOONRAKER_PORT = 7125;
export const WEBRTC_PORT = 8000;

export const STALE_AFTER_MS = 15_000;
export const RETRY_MIN_MS = 1_000;
export const RETRY_MAX_MS = 30_000;
export const RETRY_MULTIPLIER = 1.8;

export const GET_PRINTER_PARA_INTERVAL_MS = 5_000;
export const GET_PRINT_OBJECTS_INTERVAL_MS = 2_000;
export const HEATER_POLL_INTERVAL_MS = 2_000;

export function wsUrl(host: string): string {
  return `ws://${host}:${WS_PORT}`;
}

export function moonrakerUrl(host: string, path = ""): string {
  return `http://${host}:${MOONRAKER_PORT}${path}`;
}

export function webrtcSignalingUrl(host: string): string {
  return `http://${host}:${WEBRTC_PORT}/call/webrtc_local`;
}
