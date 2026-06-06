"use client";

import { PRINTER_HOST } from "@/lib/creality/config";
import { derivePrintStatus, formatDuration } from "@/lib/creality/status";
import type {
  PrintStatus,
  PrinterCommand,
  PrinterTelemetry,
} from "@/lib/creality/types";
import { CrealityWebSocketClient } from "@/lib/creality/websocket-client";
import type { PrinterCommandContext } from "@/hooks/use-printer-command";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function mergeTelemetry(
  serverTelemetry: PrinterTelemetry,
  optimisticPatch: Partial<PrinterTelemetry> | null
): PrinterTelemetry {
  if (!optimisticPatch) {
    return serverTelemetry;
  }

  return { ...serverTelemetry, ...optimisticPatch };
}

export function usePrinter(host = PRINTER_HOST) {
  const clientRef = useRef<CrealityWebSocketClient | null>(null);
  const [serverTelemetry, setServerTelemetry] = useState<PrinterTelemetry>({});
  const [optimisticPatch, setOptimisticPatch] =
    useState<Partial<PrinterTelemetry> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const serverTelemetryRef = useRef(serverTelemetry);

  const telemetryListenersRef = useRef(
    new Set<(telemetry: PrinterTelemetry) => void>()
  );

  const notifyTelemetryListeners = useCallback(
    (telemetry: PrinterTelemetry) => {
      telemetryListenersRef.current.forEach((listener) => listener(telemetry));
    },
    []
  );

  useEffect(() => {
    const client = new CrealityWebSocketClient(host);
    clientRef.current = client;

    const unsubscribeState = client.onStateChange((telemetry) => {
      setServerTelemetry(telemetry);
      notifyTelemetryListeners(telemetry);
    });
    const unsubscribeConnection = client.onConnectionChange(setIsConnected);

    const init = async () => {
      client.start();
      const telemetry = client.getTelemetry();
      setServerTelemetry(telemetry);
      notifyTelemetryListeners(telemetry);
      setIsConnected(client.isConnected());
    };
    void init();

    return () => {
      unsubscribeState();
      unsubscribeConnection();
      client.stop();
      clientRef.current = null;
    };
  }, [host, notifyTelemetryListeners]);

  const telemetry = useMemo(
    () => mergeTelemetry(serverTelemetry, optimisticPatch),
    [serverTelemetry, optimisticPatch]
  );

  const status: PrintStatus = useMemo(
    () => derivePrintStatus(telemetry, isConnected),
    [telemetry, isConnected]
  );

  const sendCommand = useCallback((command: PrinterCommand) => {
    clientRef.current?.sendCommand(command);
  }, []);

  const subscribeTelemetry = useCallback(
    (listener: (telemetry: PrinterTelemetry) => void) => {
      telemetryListenersRef.current.add(listener);
      return () => {
        telemetryListenersRef.current.delete(listener);
      };
    },
    []
  );

  const commandContext = useMemo<PrinterCommandContext>(
    () => ({
      sendCommand,
      getTelemetry: () => serverTelemetryRef.current,
      subscribeTelemetry,
      applyOptimisticPatch: (patch) => setOptimisticPatch(patch),
      clearOptimisticPatch: () => setOptimisticPatch(null),
    }),
    [sendCommand, subscribeTelemetry]
  );

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
    commandContext,
  };
}
