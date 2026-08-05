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
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  FanIcon,
  FlameIcon,
  SnowflakeIcon,
  ThermometerIcon,
  ThermometerSnowflakeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChamberTempEvaluation,
  ChamberTempStatus,
  evaluateChamberTemperature,
} from "@/lib/gcode/temperature";

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

interface ChamberTemperatureIconProps {
  status: ChamberTempStatus | undefined;
}

export function ChamberTemperatureIcon({
  status,
}: ChamberTemperatureIconProps) {
  if (!status) {
    return null;
  }

  switch (status) {
    case "cold":
      return <SnowflakeIcon className="size-3 text-sky-500" />;
    case "warning":
      return <AlertTriangleIcon className="size-3 text-yellow-500" />;
    case "critical":
      return <AlertCircleIcon className="size-3 text-red-500" />;
    case "safe":
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
      className="group/heat rounded-none border border-border/60 bg-muted/20 p-3 flex flex-col justify-between"
    >
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <PhaseIcon phase={derivedPhase} />
      </header>
      <div>
        <p className="mt-1 text-lg font-medium group-data-[phase=heating]/heat:text-orange-500 group-data-[phase=cooling]/heat:text-blue-500">
          {formatTemperature(current)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTemperature(target, 0)}
        </p>
      </div>
    </div>
  );
}

interface ChamberTempBlockProps {
  label: string;
  current: number | undefined;
  evaluation: ChamberTempEvaluation | null;
}

export function ChamberTempBlock({
  label,
  current,
  evaluation,
}: ChamberTempBlockProps) {
  let sign = "";
  let diff = null;
  if (evaluation?.status === "cold") {
    sign = "-";
    diff = evaluation?.diff;
  } else if (
    evaluation?.status === "critical" ||
    evaluation?.status === "warning"
  ) {
    sign = "+";
    diff = evaluation?.diff;
  }

  return (
    <div
      data-evaluation={evaluation}
      className="group/heat rounded-none border border-border/60 bg-muted/20 p-3 flex flex-col justify-between"
    >
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <ChamberTemperatureIcon status={evaluation?.status} />
      </header>
      <div>
        <p className="mt-1 text-lg font-medium">{formatTemperature(current)}</p>
        <p className="text-xs text-muted-foreground">
          {diff != null ? `${sign}${diff?.toFixed(0)}°C` : "\u2014"}
        </p>
      </div>
    </div>
  );
}

interface TemperatureCardProps {
  telemetry: PrinterTelemetry;
  className?: string;
  filamentType: string | null;
}

export function TemperatureCard({
  telemetry,
  className,
  filamentType,
}: TemperatureCardProps) {
  const chamberTemperatureEvaluation = evaluateChamberTemperature(
    filamentType,
    telemetry.boxTemp
  );

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
        <ChamberTempBlock
          label="Chamber"
          current={telemetry.boxTemp}
          evaluation={chamberTemperatureEvaluation}
        />
      </CardContent>
    </Card>
  );
}
