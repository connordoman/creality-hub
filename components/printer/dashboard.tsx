"use client";

import { PRINTER_HOST } from "@/lib/creality/config";
import { usePrinter } from "@/hooks/use-printer";
import { CameraViewer } from "./camera-viewer";
import { ChamberLight } from "./chamber-light";
import { ConnectionBadge } from "./connection-badge";
import { PrintControls } from "./print-controls";
import { PrintHistory } from "./print-history";
import { StatusCard } from "./status-card";
import { TemperatureCard } from "./temperature-card";

export function Dashboard() {
  const {
    telemetry,
    status,
    isConnected,
    elapsed,
    remaining,
    elapsedSeconds,
    remainingSeconds,
    sendCommand,
  } = usePrinter();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Creality K1C Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Connected to {PRINTER_HOST}
          </p>
        </div>
        <ConnectionBadge connected={isConnected} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <StatusCard
            status={status}
            telemetry={telemetry}
            elapsed={elapsed}
            remaining={remaining}
            elapsedSeconds={elapsedSeconds}
            remainingSeconds={remainingSeconds}
          />
          <TemperatureCard telemetry={telemetry} />
          <PrintControls status={status} onCommand={sendCommand} />
          <ChamberLight
            telemetry={telemetry}
            onToggle={(enabled) =>
              sendCommand(enabled ? "light-on" : "light-off")
            }
          />
        </div>

        <CameraViewer />
      </div>

      <PrintHistory />
    </div>
  );
}
