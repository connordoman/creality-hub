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
  ClockCheckIcon,
  ClockFadingIcon,
  PrinterIcon,
  RulerDimensionLineIcon,
  RulerIcon,
  WeightIcon,
} from "lucide-react";
import { formatDuration, formatDateTime } from "@/lib/time";
import { useMemo } from "react";
import dayjs from "dayjs";

interface StatusCardProps {
  status: PrintStatus;
  telemetry: PrinterTelemetry;
  elapsedSeconds: number;
  remainingSeconds: number;
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
}: StatusCardProps) {
  const progress = getProgress(telemetry) ?? 0;

  const filename = formatFileName(telemetry.printFileName) || "No active print";

  const { data: metadata } = usePrintMetadata(
    formatFileName(telemetry.printFileName)
  );

  const { length: expectedLength, weight: expectedWeight } = formatFilamentUsed(
    metadata?.filamentTotalMm,
    metadata?.filamentTotalG
  );

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

    const start = dayjs(printStartTime * 1000);
    const end = dayjs(expectedCompletionTime * 1000);

    if (start.isSame(end, "day")) {
      return {
        start: start.format("HH:mm"),
        end: end.format("HH:mm"),
      };
    }

    return {
      start: start.format("MMMM D, HH:mm"),
      end: end.format("MMMM D, HH:mm"),
    };
  }, [printStartTime, expectedCompletionTime]);

  const showScheduleFooter =
    Boolean(formatFileName(telemetry.printFileName)) &&
    (isActivePrintStatus(status) ||
      printStartTime != null ||
      expectedCompletionTime != null);

  const isPrinting = status === "printing";

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PrinterIcon className="size-4" />
          Print Status
        </CardTitle>
        <CardDescription className="break-all leading-none">
          {filename}
        </CardDescription>
        {isPrinting ? (
          <CardAction>
            <p className="font-medium text-right">
              <span className="flex items-center gap-2.5">
                <span className="whitespace-nowrap">
                  <RulerIcon className="size-3 inline-block mr-1 mb-0.5" />
                  {expectedLength?.value?.toFixed(2) ?? "\u2014"}{" "}
                  {expectedLength?.unit ?? "m"}
                </span>
                <span className="whitespace-nowrap">
                  <WeightIcon className="size-3 inline-block mr-1 mb-0.5" />
                  {expectedWeight?.value?.toFixed(1)} {expectedWeight?.unit}
                </span>
              </span>
              <span>
                {isPrinting
                  ? formatDuration(elapsedSeconds + remainingSeconds)
                  : "\u2014"}
              </span>
            </p>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={statusVariant[status]} className="capitalize">
          {status.replace("-", " ")}
        </Badge>

        <Field className="space-y-2">
          <FieldLabel htmlFor="print-progress">
            <span className="text-muted-foreground">Progress</span>
            <span className="ml-auto">{Math.round(progress)}%</span>
          </FieldLabel>
          <Progress id="print-progress" value={progress} />
        </Field>

        <div className="flex justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Elapsed</p>
            <Duration
              duration={isPrinting ? elapsedSeconds : 0}
              className="font-medium text-xl"
              realTime={isPrinting}
            />
          </div>
          <div>
            <p className="text-muted-foreground text-right">Remaining</p>
            <Duration
              duration={isPrinting ? remainingSeconds : 0}
              className="font-medium text-xl text-right"
              realTime={isPrinting}
              countDown
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className=" gap-1 text-xs text-muted-foreground flex-row items-center justify-between">
        {showScheduleFooter ? (
          <>
            <p>
              <ClockFadingIcon className="size-3 inline-block mr-1 mb-0.5" />
              {isHydrated ? timeRange?.start : "\u2014"}
            </p>
            <p>
              <ClockCheckIcon className="size-3 inline-block mr-1 mb-0.5" />
              {isHydrated ? `${timeRange?.end}` : "\u2014"}
            </p>
          </>
        ) : null}
      </CardFooter>
    </Card>
  );
}
