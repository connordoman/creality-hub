"use client";

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

export function usePrinter(host: string | undefined) {
  const clientRef = useRef<CrealityWebSocketClient | null>(null);
  const previousHostRef = useRef<string | undefined>(undefined);
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
    if (!host) {
      previousHostRef.current = undefined;
      setServerTelemetry({});
      setOptimisticPatch(null);
      setIsConnected(false);
      return;
    }

    if (previousHostRef.current !== host) {
      previousHostRef.current = host;
      setServerTelemetry({});
      setOptimisticPatch(null);
    }

    const client = new CrealityWebSocketClient(host);
    clientRef.current = client;

    const handleStateChange = (telemetry: PrinterTelemetry) => {
      if (clientRef.current !== client) {
        return;
      }

      serverTelemetryRef.current = telemetry;
      setServerTelemetry(telemetry);
      notifyTelemetryListeners(telemetry);
      setOptimisticPatch((current) => {
        if (!current) {
          return null;
        }

        const serverMatchesPatch = Object.entries(current).every(
          ([key, value]) =>
            telemetry[key as keyof PrinterTelemetry] === value,
        );

        return serverMatchesPatch ? null : current;
      });
    };

    const handleConnectionChange = (connected: boolean) => {
      if (clientRef.current !== client) {
        return;
      }

      setIsConnected(connected);
    };

    const unsubscribeState = client.onStateChange(handleStateChange);
    const unsubscribeConnection =
      client.onConnectionChange(handleConnectionChange);

    client.start();
    const telemetry = client.getTelemetry();
    serverTelemetryRef.current = telemetry;
    setServerTelemetry(telemetry);
    notifyTelemetryListeners(telemetry);
    setIsConnected(client.isConnected());

    return () => {
      clientRef.current = null;
      unsubscribeState();
      unsubscribeConnection();
      client.stop();
      setOptimisticPatch(null);
    };
  }, [host, notifyTelemetryListeners]);

  useEffect(() => {
    serverTelemetryRef.current = serverTelemetry;
  }, [serverTelemetry]);

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
