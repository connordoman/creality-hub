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
type OutboundMessage = Record<string, unknown>;

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
  private idlePollTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private lastRx = 0;
  private lastParaPoll = 0;
  private lastObjectsPoll = 0;
  private inFlight = false;
  private outboundQueue: OutboundMessage[] = [];
  private stateListeners = new Set<StateListener>();
  private connectionListeners = new Set<ConnectionListener>();

  constructor(private readonly host: string) {}

  start(): void {
    this.stopped = false;
    this.enqueueIdlePoll();
    this.pump();
    this.startStaleCheck();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.clearReconnectTimer();
    this.clearIdlePollTimer();
    this.clearDisconnectGraceTimer();
    this.closeSocket();
    this.outboundQueue = [];
    this.inFlight = false;
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
        this.sendSetParams({ pause: 1 });
        break;
      case "resume":
        this.sendSetParams({ pause: 0 });
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

  sendSetParams(params: Record<string, unknown>): void {
    this.enqueue({ method: "set", params }, true);
  }

  private sendSet(params: Record<string, number>): void {
    this.sendSetParams(params);
  }

  private enqueue(message: OutboundMessage, priority = false): void {
    if (priority) {
      this.outboundQueue.unshift(message);
    } else {
      this.outboundQueue.push(message);
    }

    this.pump();
  }

  private pump(): void {
    if (this.stopped) {
      return;
    }

    const readyState = this.ws?.readyState;

    if (readyState === WebSocket.CONNECTING) {
      return;
    }

    if (readyState === WebSocket.OPEN) {
      if (!this.inFlight) {
        this.sendNext();
      }
      return;
    }

    if (this.outboundQueue.length === 0) {
      this.enqueueIdlePoll();
    }

    if (this.outboundQueue.length === 0) {
      return;
    }

    this.clearReconnectTimer();
    this.connect();
  }

  private connect(): void {
    if (this.stopped) {
      return;
    }

    const readyState = this.ws?.readyState;
    if (
      readyState === WebSocket.CONNECTING ||
      readyState === WebSocket.OPEN
    ) {
      return;
    }

    const url = wsUrl(this.host);
    const ws = new WebSocket(url);
    this.ws = ws;
    let opened = false;

    ws.onopen = () => {
      if (!this.isActiveSocket(ws)) {
        return;
      }

      opened = true;
      this.reconnectDelay = RETRY_MIN_MS;
      this.lastRx = Date.now();
      this.clearDisconnectGraceTimer();
      this.setConnected(true);
      this.sendNext();
    };

    ws.onmessage = (event) => {
      if (!this.isActiveSocket(ws)) {
        return;
      }

      this.lastRx = Date.now();
      this.handleMessage(event.data);
    };

    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
      }

      this.inFlight = false;

      if (this.stopped) {
        this.clearDisconnectGraceTimer();
        this.setConnected(false);
        return;
      }

      this.armDisconnectGraceTimer();

      if (opened) {
        this.enqueueIdlePoll();
        queueMicrotask(() => this.pump());
        return;
      }

      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose handles recovery.
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(
      this.reconnectDelay * RETRY_MULTIPLIER,
      RETRY_MAX_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.pump();
    }, delay);
  }

  private sendNext(): void {
    if (this.inFlight || this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    if (this.outboundQueue.length === 0) {
      this.enqueueIdlePoll();
    }

    const payload = this.outboundQueue.shift();
    if (!payload) {
      return;
    }

    this.inFlight = true;
    this.ws.send(JSON.stringify(payload));
  }

  private enqueueIdlePoll(): void {
    if (this.outboundQueue.length > 0) {
      return;
    }

    const now = Date.now();
    const needsObjects =
      now - this.lastObjectsPoll >= GET_PRINT_OBJECTS_INTERVAL_MS;
    const needsPara = now - this.lastParaPoll >= GET_PRINTER_PARA_INTERVAL_MS;

    if (needsObjects) {
      this.lastObjectsPoll = now;
      this.outboundQueue.push({
        method: "get",
        params: { reqPrintObjects: 1 },
      });
      return;
    }

    if (needsPara) {
      this.lastParaPoll = now;
      this.outboundQueue.push({
        method: "get",
        params: { ReqPrinterPara: 1 },
      });
      return;
    }

    this.scheduleIdlePoll();
  }

  private scheduleIdlePoll(): void {
    if (this.stopped || this.idlePollTimer || this.outboundQueue.length > 0) {
      return;
    }

    const now = Date.now();
    const nextObjectsIn = Math.max(
      0,
      GET_PRINT_OBJECTS_INTERVAL_MS - (now - this.lastObjectsPoll),
    );
    const nextParaIn = Math.max(
      0,
      GET_PRINTER_PARA_INTERVAL_MS - (now - this.lastParaPoll),
    );
    const delay = Math.min(nextObjectsIn, nextParaIn, RETRY_MIN_MS);

    this.idlePollTimer = setTimeout(() => {
      this.idlePollTimer = null;
      this.enqueueIdlePoll();
      this.pump();
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

  private startStaleCheck(): void {
    if (this.staleTimer) return;

    this.staleTimer = setInterval(() => {
      if (this.isStale()) {
        this.inFlight = false;
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

  private clearIdlePollTimer(): void {
    if (this.idlePollTimer) {
      clearTimeout(this.idlePollTimer);
      this.idlePollTimer = null;
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
