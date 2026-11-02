"use client";

import type { HeaterPhase, PrinterTelemetry } from "@/lib/creality/types";
import { cn } from "@/lib/utils";
import {
  evaluateChamberTemperature,
  FilamentType,
} from "@/lib/gcode/temperature";
import { ChamberTempBlock, TempBlock } from "./temp-block";

export type { HeaterPhase };

interface TemperatureCardProps {
  telemetry: PrinterTelemetry;
  className?: string;
  filamentType: string | string[] | null;
}

export function TemperatureCard({
  telemetry,
  className,
  filamentType,
}: TemperatureCardProps) {
  const chamberTemperatureEvaluation = evaluateChamberTemperature(
    filamentType as FilamentType | null,
    telemetry.boxTemp,
  );

  return (
    <div className={cn("grid gap-3 grid-cols-3 flex-1 items-end", className)}>
      <TempBlock
        label="Nozzle"
        current={telemetry.nozzleTemp}
        target={telemetry.targetNozzleTemp}
      />
      <TempBlock
        label="Bed"
        current={telemetry.bedTemp0}
        target={telemetry.targetBedTemp0}
      />
      <ChamberTempBlock
        label="Chamber"
        current={telemetry.boxTemp}
        evaluation={chamberTemperatureEvaluation}
      />
    </div>
  );
}
