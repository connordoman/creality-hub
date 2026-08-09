"use client";

import { usePrinter } from "@/hooks/use-printer";
import { useRefetchPrintHistoryOnPrintStart } from "@/hooks/use-refetch-print-history-on-print-start";
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
import { useState } from "react";
import { cn } from "@/lib/utils";
import useGcodeAnalysis from "@/hooks/use-gcode-analysis";
import { formatFileName } from "@/lib/fs";
import MotorControls from "./motor-controls/motor-controls";
import { Separator } from "../ui/separator";

export function Dashboard() {
  const [cameraMaximized, setCameraMaximized] = useState(false);

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

  useRefetchPrintHistoryOnPrintStart(status);

  const { data: gcodeAnalysis } = useGcodeAnalysis(
    formatFileName(telemetry.printFileName),
  );

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
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight leading-none mb-1 whitespace-nowrap">
              {printerName}
            </h1>
            <ConnectionBadge connected={isConnected} className="mb-1" />
          </div>
          <p className="text-sm text-muted-foreground">
            Connected to {printerHost}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <PrinterSettingsDialog />
        </div>
      </header>

      <div
        className={cn(
          "flex flex-col lg:grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]",
          cameraMaximized ? "flex flex-col" : "",
        )}
      >
        <CameraViewer
          className="row-span-2 col-start-1 lg:col-span-1 lg:col-start-2 lg:row-start-1"
          maximized={cameraMaximized}
          onMaximize={() => setCameraMaximized(!cameraMaximized)}
          telemetry={telemetry}
          commandContext={commandContext}
          isConnected={isConnected}
        />
        <StatusCard
          status={status}
          telemetry={telemetry}
          elapsedSeconds={elapsedSeconds}
          remainingSeconds={remainingSeconds}
        />
        <PrintControls
          status={status}
          onCommand={sendCommand}
          className="self-start"
        />
        <TemperatureCard
          telemetry={telemetry}
          filamentType={(gcodeAnalysis?.filamentType as string) ?? null}
        />

        <MotorControls
          telemetry={telemetry}
          commandContext={commandContext}
          enabled={isConnected && status === "idle"}
          className="col-span-1"
        />
      </div>

      <Separator />

      <PrintHistory />
    </div>
  );
}
