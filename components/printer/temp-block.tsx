"use client";

import type { ReactNode } from "react";
import { formatTemperature } from "@/lib/temperature";
import type { HeaterPhase } from "@/lib/creality/types";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  FanIcon,
  FlameIcon,
  SnowflakeIcon,
  ThermometerIcon,
} from "lucide-react";
import {
  CHAMBER_TEMPERATURE_WARNING_DELTA,
  ChamberTempEvaluation,
} from "@/lib/gcode/temperature";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { HotSurfaceIcon } from "../ui/icons/hot-surface-icon";

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

function BurnHazardIcon() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="flex gap-px [&_svg]:size-3.5 text-red-600" />}
      >
        <AlertTriangleIcon />
        <HotSurfaceIcon />
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <strong>CAUTION: BURN HAZARD</strong>
          <br />
          Surface is above 60°C
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface TempBlockLayoutProps {
  label: string;
  /** Formatted current temperature. */
  value: string;
  /** Secondary text shown below the value (e.g. the target). */
  detail: ReactNode;
  /** Icon shown at the end of the header. */
  headerAccessory?: ReactNode;
  /** Icon shown at the end of the footer row. */
  footerAccessory?: ReactNode;
  phase?: HeaterPhase;
}

/** Shared shell for every block in the temperature card. */
function TempBlockLayout({
  label,
  value,
  detail,
  headerAccessory,
  footerAccessory,
  phase = "static",
}: TempBlockLayoutProps) {
  return (
    <div
      data-phase={phase}
      className="group/heat rounded-none border border-border/60 bg-card p-3 flex flex-col justify-between aspect-3/2"
    >
      <header className="flex items-center justify-between">
        <span className="inline-flex gap-1 items-center">
          <ThermometerIcon className="size-3" />
          <p className="inline text-xs text-muted-foreground">{label}</p>
        </span>
        {headerAccessory}
      </header>
      <div>
        <p className="mt-1 text-lg font-medium group-data-[phase=heating]/heat:text-orange-500 group-data-[phase=cooling]/heat:text-blue-500">
          {value}
        </p>
        <div className="flex items-end gap-1 justify-between">
          <p className="text-xs text-muted-foreground">{detail}</p>
          {footerAccessory}
        </div>
      </div>
    </div>
  );
}

interface TempBlockProps {
  label: string;
  current: number | undefined;
  target: number | undefined;
}

export function TempBlock({ label, current, target }: TempBlockProps) {
  const delta = Math.abs((current ?? 0) - (target ?? 0));

  let phase: HeaterPhase = "static";
  if (!!target && delta > 3) {
    phase = (current ?? 0) > target ? "cooling" : "heating";
  }

  const mayRiskInjury = !!current && current > 60;

  return (
    <TempBlockLayout
      label={label}
      value={formatTemperature(current)}
      detail={formatTemperature(target, 0)}
      phase={phase}
      headerAccessory={<PhaseIcon phase={phase} />}
      footerAccessory={mayRiskInjury ? <BurnHazardIcon /> : null}
    />
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
  if (evaluation?.status === "cold") {
    sign = "-";
  } else if (
    evaluation?.status === "critical" ||
    evaluation?.status === "warning"
  ) {
    sign = "+";
  }

  const high = evaluation?.chamberTemperature.high;

  return (
    <TempBlockLayout
      label={label}
      value={formatTemperature(current)}
      detail={high ? `${sign}${high.toFixed(0)}°C` : "—"}
      footerAccessory={<ChamberTemperatureIcon evaluation={evaluation} />}
    />
  );
}
