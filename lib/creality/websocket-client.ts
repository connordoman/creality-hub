import {
  GET_PRINTER_PARA_INTERVAL_MS,
  GET_PRINT_OBJECTS_INTERVAL_MS,
  RECONNECT_GRACE_MS,
  RETRY_MAX_MS,
  RETRY_MIN_MS,
  RETRY_MULTIPLIER,
  STALE_AFTER_MS,
  wsUrl,
} from "./config";
import { coerceNumbers } from "./status";
import type { PrinterCommand, PrinterTelemetry } from "./types";

type StateListener = (telemetry: PrinterTelemetry) => void;
type ConnectionListener = (connected: boolean) => void;

function mergeTelemetry(
  current: PrinterTelemetry,
  incoming: PrinterTelemetry,
): PrinterTelemetry {
  const merged = { ...current };

  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }

  return merged;
}

export class CrealityWebSocketClient {
  private ws: WebSocket | null = null;
  private state: PrinterTelemetry = {};
  private stopped = false;
  private connected = false;
  private reconnectDelay = RETRY_MIN_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private paraTimer: ReturnType<typeof setInterval> | null = null;
  private objectsTimer: ReturnType<typeof setInterval> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private lastRx = 0;
  private stateListeners = new Set<StateListener>();
  private connectionListeners = new Set<ConnectionListener>();

  constructor(private readonly host: string) {}

  start(): void {
    this.stopped = false;
    this.connect();
    this.startStaleCheck();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.clearReconnectTimer();
    this.clearDisconnectGraceTimer();
    this.closeSocket();
    this.setConnected(false);
  }

  getTelemetry(): PrinterTelemetry {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.connected;
  }

  private isSocketOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private isStale(): boolean {
    return this.isSocketOpen() && Date.now() - this.lastRx >= STALE_AFTER_MS;
  }

  private isActiveSocket(ws: WebSocket): boolean {
    return !this.stopped && this.ws === ws;
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  sendCommand(command: PrinterCommand): void {
    switch (command) {
      case "pause":
        this.sendSet({ pause: 1 });
        break;
      case "resume":
        this.sendSet({ pause: 0 });
        break;
      case "stop":
        this.sendSet({ stop: 1 });
        break;
      case "light-on":
        this.sendSet({ lightSw: 1 });
        break;
      case "light-off":
        this.sendSet({ lightSw: 0 });
        break;
    }
  }

  private connect(): void {
    if (this.stopped) return;

    this.closeSocket();

    const url = wsUrl(this.host);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      if (!this.isActiveSocket(ws)) return;

      this.reconnectDelay = RETRY_MIN_MS;
      this.lastRx = Date.now();
      this.clearDisconnectGraceTimer();
      this.setConnected(true);
      this.startPeriodicGets();
      this.sendJson({ method: "get", params: { ReqPrinterPara: 1 } });
    };

    ws.onmessage = (event) => {
      if (!this.isActiveSocket(ws)) return;

      this.lastRx = Date.now();
      this.handleMessage(event.data);
    };

    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
      }

      this.clearPeriodicGets();

      if (this.stopped) {
        this.clearDisconnectGraceTimer();
        this.setConnected(false);
        return;
      }

      // The printer often closes the socket between exchanges. Stay
      // "connected" during auto-reconnect instead of flickering every second.
      this.armDisconnectGraceTimer();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;

    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(
      this.reconnectDelay * RETRY_MULTIPLIER,
      RETRY_MAX_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== "string") return;

    const text = raw.trim();
    if (text === "ok") return;

    try {
      const payload = JSON.parse(text) as Record<string, unknown>;

      if (payload.ModeCode === "heart_beat") {
        this.ws?.send("ok");
        return;
      }

      const merged = coerceNumbers(payload) as PrinterTelemetry;
      this.state = mergeTelemetry(this.state, merged);
      this.emitState();
    } catch {
      // Ignore non-JSON frames.
    }
  }

  private sendSet(params: Record<string, number>): void {
    this.sendJson({ method: "set", params });
  }

  private sendJson(payload: Record<string, unknown>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private startPeriodicGets(): void {
    this.clearPeriodicGets();

    this.paraTimer = setInterval(() => {
      this.sendJson({ method: "get", params: { ReqPrinterPara: 1 } });
    }, GET_PRINTER_PARA_INTERVAL_MS);

    this.objectsTimer = setInterval(() => {
      this.sendJson({ method: "get", params: { reqPrintObjects: 1 } });
    }, GET_PRINT_OBJECTS_INTERVAL_MS);
  }

  private clearPeriodicGets(): void {
    if (this.paraTimer) {
      clearInterval(this.paraTimer);
      this.paraTimer = null;
    }
    if (this.objectsTimer) {
      clearInterval(this.objectsTimer);
      this.objectsTimer = null;
    }
  }

  private startStaleCheck(): void {
    if (this.staleTimer) return;

    this.staleTimer = setInterval(() => {
      if (this.isStale()) {
        this.ws?.close();
      }
    }, 2_000);
  }

  private closeSocket(): void {
    const ws = this.ws;
    if (!ws) return;

    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;

    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
    }

    if (this.ws === ws) {
      this.ws = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearDisconnectGraceTimer(): void {
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }
  }

  private armDisconnectGraceTimer(): void {
    this.clearDisconnectGraceTimer();

    this.disconnectGraceTimer = setTimeout(() => {
      this.disconnectGraceTimer = null;
      if (!this.stopped && !this.isSocketOpen()) {
        this.setConnected(false);
      }
    }, RECONNECT_GRACE_MS);
  }

  private clearTimers(): void {
    this.clearPeriodicGets();
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private setConnected(connected: boolean): void {
    if (connected === this.connected) {
      return;
    }

    this.connected = connected;
    this.connectionListeners.forEach((listener) => listener(connected));
  }

  private emitState(): void {
    const snapshot = this.getTelemetry();
    this.stateListeners.forEach((listener) => listener(snapshot));
  }
}
