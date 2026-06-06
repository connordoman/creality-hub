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
import { formatFilamentUsed, getProgress } from "@/lib/creality/status";
import type { PrintStatus, PrinterTelemetry } from "@/lib/creality/types";
import { Field, FieldLabel } from "../ui/field";
import { Duration } from "../ui/duration";
import { usePrintMetadata } from "@/hooks/use-print-metadata";
import { formatFileName } from "@/lib/fs";
import { PrinterIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import { formatDuration } from "@/lib/time";

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
  const expectedFilament = formatFilamentUsed(
    metadata?.filamentTotalMm,
    metadata?.filamentTotalG
  );

  const isPrinting = status === "printing";

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PrinterIcon className="size-4" />
          Print Status
        </CardTitle>
        <CardDescription>{filename}</CardDescription>
        <CardAction>
          <p className="font-medium text-right">
            <span>{expectedFilament}</span>
            <br />
            <span>{formatDuration(elapsedSeconds + remainingSeconds)}</span>
          </p>
        </CardAction>
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
              className="font-medium text-xl"
              realTime={isPrinting}
              countDown
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
