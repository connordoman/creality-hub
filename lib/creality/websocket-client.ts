import {
  GET_PRINTER_PARA_INTERVAL_MS,
  GET_PRINT_OBJECTS_INTERVAL_MS,
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

export class CrealityWebSocketClient {
  private ws: WebSocket | null = null;
  private state: PrinterTelemetry = {};
  private stopped = false;
  private reconnectDelay = RETRY_MIN_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnected(false);
  }

  getTelemetry(): PrinterTelemetry {
    return { ...this.state };
  }

  isConnected(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN &&
      Date.now() - this.lastRx < STALE_AFTER_MS
    );
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

    const url = wsUrl(this.host);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = RETRY_MIN_MS;
      this.lastRx = Date.now();
      this.setConnected(true);
      this.startPeriodicGets();
      this.sendJson({ method: "get", params: { ReqPrinterPara: 1 } });
    };

    ws.onmessage = (event) => {
      this.lastRx = Date.now();
      this.handleMessage(event.data);
    };

    ws.onerror = () => {
      this.setConnected(false);
    };

    ws.onclose = () => {
      this.clearPeriodicGets();
      this.ws = null;
      this.setConnected(false);
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
      this.state = { ...this.state, ...merged };
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
      const connected = this.isConnected();
      this.connectionListeners.forEach((listener) => listener(connected));
    }, 2_000);
  }

  private clearTimers(): void {
    this.clearPeriodicGets();
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private setConnected(connected: boolean): void {
    this.connectionListeners.forEach((listener) => listener(connected));
  }

  private emitState(): void {
    const snapshot = this.getTelemetry();
    this.stateListeners.forEach((listener) => listener(snapshot));
  }
}
