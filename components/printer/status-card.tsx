"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatFilamentUsed,
  getExpectedCompletionTime,
  getPrintStartTime,
  getProgress,
  isActivePrintStatus,
} from "@/lib/creality/status";
import type { PrintStatus, PrinterTelemetry } from "@/lib/creality/types";
import { Field, FieldLabel } from "../ui/field";
import { Duration } from "../ui/duration";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { usePrintMetadata } from "@/hooks/use-print-metadata";
import { formatFileName } from "@/lib/fs";
import {
  PauseIcon,
  PrinterIcon,
  RulerIcon,
  SpoolIcon,
  WeightIcon,
} from "lucide-react";
import { formatDuration } from "@/lib/time";
import { useMemo } from "react";
import dayjs from "dayjs";
import { ClockCheckIcon } from "../ui/icons/clock-check-icon";
import { ClockFadingIcon } from "../ui/icons/clock-fading-icon";
import { cn } from "@/lib/utils";
import useGcodeAnalysis from "@/hooks/use-gcode-analysis";
import { Spinner } from "../ui/spinner";
import { evaluateChamberTemperature } from "@/lib/gcode/temperature";

interface StatusCardProps {
  status: PrintStatus;
  telemetry: PrinterTelemetry;
  elapsedSeconds: number;
  remainingSeconds: number;
  className?: string;
}

const statusVariant: Record<
  PrintStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  idle: "secondary",
  processing: "outline",
  printing: "default",
  paused: "outline",
  stopped: "destructive",
  completed: "default",
  error: "destructive",
  "self-testing": "outline",
  disconnected: "destructive",
};

export function StatusCard({
  status,
  telemetry,
  elapsedSeconds,
  remainingSeconds,
  className,
}: StatusCardProps) {
  const progress = getProgress(telemetry) ?? 0;

  const filename = formatFileName(telemetry.printFileName);

  const { data: metadata } = usePrintMetadata(
    formatFileName(telemetry.printFileName)
  );

  const { length: expectedLength, weight: expectedWeight } = formatFilamentUsed(
    metadata?.filamentTotalMm,
    metadata?.filamentTotalG
  );

  const { data: gcodeAnalysis, isLoading } = useGcodeAnalysis(filename);

  const isHydrated = useIsHydrated();

  const printStartTime = useMemo(
    () => getPrintStartTime(telemetry, metadata, elapsedSeconds, status),
    [telemetry, metadata, elapsedSeconds, status]
  );

  const expectedCompletionTime = useMemo(
    () =>
      getExpectedCompletionTime(
        printStartTime,
        elapsedSeconds,
        remainingSeconds,
        metadata?.estimatedTimeSeconds ?? null,
        status
      ),
    [
      printStartTime,
      elapsedSeconds,
      remainingSeconds,
      metadata?.estimatedTimeSeconds,
      status,
    ]
  );

  const timeRange = useMemo(() => {
    if (printStartTime == null) return null;
    if (expectedCompletionTime == null) return null;

    const startDate = new Date(printStartTime * 1000);
    const endDate = new Date(expectedCompletionTime * 1000);

    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const dateOptions: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    if (sameDay) {
      return {
        start: startDate.toLocaleTimeString(undefined, timeOptions),
        end: endDate.toLocaleTimeString(undefined, timeOptions),
      };
    }

    return {
      start: startDate.toLocaleString(undefined, dateOptions),
      end: endDate.toLocaleString(undefined, dateOptions),
    };
  }, [printStartTime, expectedCompletionTime]);

  const showTimeRange =
    Boolean(formatFileName(telemetry.printFileName)) &&
    (isActivePrintStatus(status) ||
      printStartTime != null ||
      expectedCompletionTime != null);

  const isLivePrint = isActivePrintStatus(status);

  const layerCount = gcodeAnalysis?.totalLayerCount
    ? `${gcodeAnalysis.totalLayerCount} layers`
    : "\u2014";

  return (
    <Card className={cn("flex-1 flex", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PrinterIcon className="size-4" />
          Print Status
          <Badge variant={statusVariant[status]} className="capitalize">
            {status.replace("-", " ")}
          </Badge>
          {gcodeAnalysis?.filamentType ? (
            <Badge variant="outline" className="capitalize">
              {gcodeAnalysis.filamentType}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="break-all leading-none">
          {filename || "No active print"}
          {isLoading ? (
            <Badge variant="outline" className="ml-2">
              <Spinner /> Analyzing...
            </Badge>
          ) : null}
        </CardDescription>
        {isLivePrint ? (
          <CardAction>
            <p className="font-medium text-right">
              <span className="flex items-center gap-2.5">
                <span className="whitespace-nowrap">
                  <SpoolIcon className="size-3 inline-block mr-1 mb-0.5" />
                  {expectedLength?.value?.toFixed(2) ?? "\u2014"}{" "}
                  {expectedLength?.unit ?? "m"}
                </span>
                <span className="whitespace-nowrap">
                  <WeightIcon className="size-3 inline-block mr-1 mb-0.5" />
                  {expectedWeight?.value?.toFixed(1) ?? "\u2014"}{" "}
                  {expectedWeight?.unit}
                </span>
              </span>
              <span>
                {isLivePrint
                  ? formatDuration(elapsedSeconds + remainingSeconds)
                  : "\u2014"}
              </span>
              <br />
              <span>{layerCount}</span>
            </p>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-0 flex-1 flex flex-col justify-between">
        <Field className="space-y-2">
          <FieldLabel htmlFor="print-progress">
            <span className="text-muted-foreground">Progress</span>
            <span className="ml-auto">{Math.round(progress)}%</span>
          </FieldLabel>
          <Progress
            id="print-progress"
            value={progress}
            indications={gcodeAnalysis?.pauses.map((pause) => ({
              percentage: pause.percentage,
              label: (
                <>
                  <PauseIcon className="size" />
                  <span>{Math.floor(pause.percentage)}%</span>
                </>
              ),
            }))}
          />
        </Field>

        {showTimeRange ? (
          <div className="flex gap-1 text-sm text-muted-foreground flex-row items-center justify-between mt-1">
            <p aria-label="Print start time">
              <ClockFadingIcon className="size-4 inline-block mr-1 mb-0.5" />
              {isHydrated ? timeRange?.start : "\u2014"}
            </p>
            <p aria-label="Print end time">
              <ClockCheckIcon
                className="size-4 inline-block mr-1 mb-0.5"
                checkColor="oklch(0.627 0.194 149.214)"
              />
              {isHydrated ? `${timeRange?.end}` : "\u2014"}
            </p>
          </div>
        ) : null}

        <div className="flex justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Elapsed</p>
            <Duration
              duration={isLivePrint ? elapsedSeconds : 0}
              className="font-medium text-xl"
              realTime={isLivePrint}
            />
          </div>
          <div>
            <p className="text-muted-foreground text-right">Remaining</p>
            <Duration
              duration={isLivePrint ? remainingSeconds : 0}
              className="font-medium text-xl text-right"
              realTime={isLivePrint}
              countDown
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
