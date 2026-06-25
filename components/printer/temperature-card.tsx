"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHeaterPhases } from "@/hooks/use-heater-phases";
import { formatTemperature } from "@/lib/temperature";
import type { HeaterPhase, PrinterTelemetry } from "@/lib/creality/types";
import { ThermometerIcon } from "lucide-react";

export type { HeaterPhase };

interface TempBlockProps {
  label: string;
  current: number | undefined;
  target: number | undefined;
}

export function TempBlock({ label, current, target }: TempBlockProps) {
  const delta = Math.abs((current ?? 0) - (target ?? 0));
  const direction = (current ?? 0) > (target ?? 0) ? -1 : 1;

  let derivedPhase = "static";
  if (current === undefined || target === undefined) {
    derivedPhase = "static";
  } else if (delta > 3) {
    derivedPhase = direction > 0 ? "heating" : "cooling";
  }

  return (
    <div
      data-phase={derivedPhase}
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
  const { data: phases } = useHeaterPhases(
    undefined,
    process.env.NODE_ENV === "development"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThermometerIcon className="size-4" />
          Temperatures
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 grid-cols-3">
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
        <TempBlock
          label="Chamber"
          current={telemetry.boxTemp}
          target={telemetry.targetBoxTemp}
        />
      </CardContent>
      {process.env.NODE_ENV === "development" && (
        <CardFooter>
          <pre>{JSON.stringify(phases.raw, null, 2)}</pre>
        </CardFooter>
      )}
    </Card>
  );
}
