"use client";

import { PRINTER_HOST } from "@/lib/creality/config";
import { derivePrintStatus, formatDuration } from "@/lib/creality/status";
import type {
  PrintStatus,
  PrinterCommand,
  PrinterTelemetry,
} from "@/lib/creality/types";
import { CrealityWebSocketClient } from "@/lib/creality/websocket-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function usePrinter(host = PRINTER_HOST) {
  const clientRef = useRef<CrealityWebSocketClient | null>(null);
  const [telemetry, setTelemetry] = useState<PrinterTelemetry>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = new CrealityWebSocketClient(host);
    clientRef.current = client;

    const unsubscribeState = client.onStateChange(setTelemetry);
    const unsubscribeConnection = client.onConnectionChange(setIsConnected);

    const init = async () => {
      client.start();
      setTelemetry(client.getTelemetry());
      setIsConnected(client.isConnected());
    };
    void init();

    return () => {
      unsubscribeState();
      unsubscribeConnection();
      client.stop();
      clientRef.current = null;
    };
  }, [host]);

  const status: PrintStatus = useMemo(
    () => derivePrintStatus(telemetry, isConnected),
    [telemetry, isConnected]
  );

  const sendCommand = useCallback((command: PrinterCommand) => {
    clientRef.current?.sendCommand(command);
  }, []);

  const elapsed = formatDuration(telemetry.printJobTime);
  const remaining = formatDuration(telemetry.printLeftTime);
  const elapsedSeconds = telemetry.printJobTime ?? 0;
  const remainingSeconds = telemetry.printLeftTime ?? 0;

  return {
    telemetry,
    status,
    isConnected,
    elapsed,
    remaining,
    elapsedSeconds,
    remainingSeconds,
    sendCommand,
  };
}
