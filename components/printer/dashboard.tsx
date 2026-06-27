"use client";

import { usePrinter } from "@/hooks/use-printer";
import { usePrinterSettings } from "@/context/printer-settings";
import { CameraViewer } from "./camera-viewer";
import { ConnectionBadge } from "./connection-badge";
import { PrintControls } from "./print-controls";
import { PrintHistory } from "./print-history";
import { PrinterSettingsDialog } from "./printer-settings-dialog";
import { StatusCard } from "./status-card";
import { TemperatureCard } from "./temperature-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrinterOptions } from "./printer-options";

export function Dashboard() {
  const { printerHost, printerName, isLoading, error } = usePrinterSettings();
  const {
    telemetry,
    status,
    isConnected,
    elapsedSeconds,
    remainingSeconds,
    sendCommand,
    commandContext,
  } = usePrinter(printerHost);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !printerHost) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Unable to load printer settings."}
        </p>
        <PrinterSettingsDialog />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <header className="flex gap-3 flex-row items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight leading-none mb-1">
            {printerName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Connected to {printerHost}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <ConnectionBadge connected={isConnected} />
          <PrinterSettingsDialog />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="row-start-2 md:row-start-auto flex flex-col gap-6">
          <StatusCard
            status={status}
            telemetry={telemetry}
            elapsedSeconds={elapsedSeconds}
            remainingSeconds={remainingSeconds}
          />
          <TemperatureCard telemetry={telemetry} />
          <PrintControls status={status} onCommand={sendCommand} />
        </div>
        <div className="row-start-1 md:row-start-auto space-y-6">
          <CameraViewer />
          <PrinterOptions
            telemetry={telemetry}
            commandContext={commandContext}
            isConnected={isConnected}
          />
        </div>
      </div>

      <PrintHistory />
    </div>
  );
}
