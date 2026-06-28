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
import { FanIcon, FlameIcon, ThermometerIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type { HeaterPhase };

interface PhaseIconProps {
  phase: HeaterPhase;
}

export function PhaseIcon({ phase }: PhaseIconProps) {
  switch (phase) {
    case "heating":
      return <FlameIcon className="size-3 text-orange-500 animate-pulse" />;
    case "cooling":
      return <FanIcon className="size-3 text-blue-500 animate-spin-reverse" />;
    default:
      return null;
  }
}

interface TempBlockProps {
  label: string;
  current: number | undefined;
  target: number | undefined;
}

export function TempBlock({ label, current, target }: TempBlockProps) {
  const delta = Math.abs((current ?? 0) - (target ?? 0));

  let derivedPhase: HeaterPhase = "static";
  if (!!target && delta > 3) {
    const direction = (current ?? 0) > (target ?? 0) ? -1 : 1;
    derivedPhase = direction > 0 ? "heating" : "cooling";
  }

  return (
    <div
      data-phase={derivedPhase}
      className="group/heat rounded-none border border-border/60 bg-muted/20 p-3"
    >
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <PhaseIcon phase={derivedPhase} />
      </header>
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
  className?: string;
}

export function TemperatureCard({
  telemetry,
  className,
}: TemperatureCardProps) {
  return (
    <Card className={cn("flex-1", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThermometerIcon className="size-4" />
          Temperatures
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 grid-cols-3 flex-1">
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
    </Card>
  );
}
