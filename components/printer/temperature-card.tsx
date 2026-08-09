"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTemperature } from "@/lib/temperature";
import type { HeaterPhase, PrinterTelemetry } from "@/lib/creality/types";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  FanIcon,
  FlameIcon,
  SnowflakeIcon,
  ThermometerIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAMBER_TEMPERATURE_WARNING_DELTA,
  ChamberTempEvaluation,
  evaluateChamberTemperature,
  FilamentType,
} from "@/lib/gcode/temperature";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { HotSurfaceIcon } from "../ui/icons/hot-surface-icon";

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
  evaluation: ChamberTempEvaluation | null;
}

export function ChamberTemperatureIcon({
  evaluation,
}: ChamberTemperatureIconProps) {
  if (!evaluation) {
    return null;
  }

  let content = null;
  let info = null;

  switch (evaluation.status) {
    case "cold":
      content = <SnowflakeIcon className="size-3.5 text-sky-500" />;
      info = (
        <p>
          <strong>CHAMBER TOO COLD</strong>
          <br />
          The chamber is <strong>{evaluation.diff}°C</strong> below the
          recommended temperature of{" "}
          <strong>{evaluation.chamberTemperature.low}°C</strong> for{" "}
          <strong>{evaluation.filamentType}</strong>
        </p>
      );
      break;
    case "warning":
      content = <AlertTriangleIcon className="size-3.5 text-yellow-500" />;
      info = (
        <p>
          <strong>CHAMBER HOT</strong>
          <br />
          The chamber is within{" "}
          <strong>{CHAMBER_TEMPERATURE_WARNING_DELTA}°C</strong> of the
          recommended maximum temperature of{" "}
          <strong>{evaluation.chamberTemperature.high}°C</strong> for{" "}
          <strong>{evaluation.filamentType}</strong>.
          <br />
          Print problems may occur.
        </p>
      );
      break;
    case "critical":
      content = <AlertCircleIcon className="size-3.5 text-red-600" />;
      info = (
        <p>
          <strong>CHAMBER CRITICAL</strong>
          <br />
          The chamber is{" "}
          <strong>
            {evaluation.diff - CHAMBER_TEMPERATURE_WARNING_DELTA}°C
          </strong>{" "}
          above the recommended maximum temperature of{" "}
          <strong>{evaluation.chamberTemperature.high}°C</strong> for{" "}
          <strong>{evaluation.filamentType}</strong>.
          <br />
          {
            "Print problems are likely to occur. Remove the printer's lid or otherwise ventilate the chamber."
          }
        </p>
      );
      break;
  }

  if (!content) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger>{content}</TooltipTrigger>
      <TooltipContent>{info}</TooltipContent>
    </Tooltip>
  );
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

  const mayRiskInjury = current && current > 60;

  return (
    <div
      data-phase={derivedPhase}
      className="group/heat rounded-none border border-border/60 bg-muted/20 p-3 flex flex-col justify-between aspect-square"
    >
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <PhaseIcon phase={derivedPhase} />
      </header>
      <div>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-lg font-medium group-data-[phase=heating]/heat:text-orange-500 group-data-[phase=cooling]/heat:text-blue-500">
            {formatTemperature(current)}
          </p>
        </div>
        <div className="flex items-end gap-1 justify-between">
          <p className="text-xs text-muted-foreground">
            {formatTemperature(target, 0)}
          </p>
          {mayRiskInjury ? (
            <Tooltip>
              <TooltipTrigger>
                <HotSurfaceIcon className="size-3.5 inline text-red-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  <strong>CAUTION: BURN HAZARD</strong>
                  <br />
                  Surface is above 60°C
                </p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
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
      className="group/heat rounded-none border border-border/60 bg-muted/20 p-3 flex flex-col justify-between aspect-square"
    >
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
      </header>
      <div>
        <p className="mt-1 text-lg font-medium">{formatTemperature(current)}</p>
        <div className="flex items-end gap-1 justify-between">
          <p className="text-xs text-muted-foreground">
            {/* {diff != null ? `${sign}${diff?.toFixed(0)}°C` : "\u2014"} */}
            {"< "}
            {evaluation?.chamberTemperature.high}°C
          </p>
          <ChamberTemperatureIcon evaluation={evaluation} />
        </div>
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
    filamentType as FilamentType | null,
    telemetry.boxTemp,
  );

  return (
    <Card className={cn("flex-1", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThermometerIcon className="size-4" />
          Temperatures
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 grid-cols-3 flex-1 items-end">
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
