"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHeaterPhases } from "@/hooks/use-heater-phases";
import { formatTemperature } from "@/lib/temperature";
import type { HeaterPhase, PrinterTelemetry } from "@/lib/creality/types";

export type { HeaterPhase };

interface TempBlockProps {
  label: string;
  current: number | undefined;
  target: number | undefined;
  phase: HeaterPhase;
}

export function TempBlock({ label, current, target, phase }: TempBlockProps) {
  return (
    <div
      data-phase={phase}
      className="group/heat rounded-none border border-border/60 bg-muted/20 p-3"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium group-data-[phase=heating]/heat:text-orange-500 group-data-[phase=cooling]/heat:text-blue-500">
        {formatTemperature(current)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatTemperature(target, 0)}
      </p>
    </div>
  );
}

interface TemperatureCardProps {
  telemetry: PrinterTelemetry;
}

export function TemperatureCard({ telemetry }: TemperatureCardProps) {
  const { data: phases } = useHeaterPhases();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temperatures</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <TempBlock
          label="Nozzle"
          current={telemetry.nozzleTemp}
          target={telemetry.targetNozzleTemp}
          phase={phases.nozzle}
        />
        <TempBlock
          label="Bed"
          current={telemetry.bedTemp0}
          target={telemetry.targetBedTemp0}
          phase={phases.bed}
        />
        <TempBlock
          label="Chamber"
          current={telemetry.boxTemp}
          target={telemetry.targetBoxTemp}
          phase="static"
        />
      </CardContent>
    </Card>
  );
}
