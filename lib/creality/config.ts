export const PRINTER_HOST =
  process.env.NEXT_PUBLIC_PRINTER_HOST ?? "10.0.0.184";

export const WS_PORT = 9999;
export const MOONRAKER_PORT = 7125;
export const WEBRTC_PORT = 8000;

export const STALE_AFTER_MS = 15_000;
export const RETRY_MIN_MS = 1_000;
export const RETRY_MAX_MS = 30_000;
export const RETRY_MULTIPLIER = 1.8;

export const GET_PRINTER_PARA_INTERVAL_MS = 5_000;
export const GET_PRINT_OBJECTS_INTERVAL_MS = 2_000;

export function wsUrl(host = PRINTER_HOST): string {
  return `ws://${host}:${WS_PORT}`;
}

export function moonrakerUrl(host = PRINTER_HOST, path = ""): string {
  return `http://${host}:${MOONRAKER_PORT}${path}`;
}

export function webrtcSignalingUrl(host = PRINTER_HOST): string {
  return `http://${host}:${WEBRTC_PORT}/call/webrtc_local`;
}
