import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getProgress } from "@/lib/creality/status";
import type { PrintStatus, PrinterTelemetry } from "@/lib/creality/types";
import { Field, FieldLabel } from "../ui/field";
import { Duration } from "../ui/duration";
import { formatFileName } from "@/lib/fs";

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

  const isPrinting = status === "printing";

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Print Status</CardTitle>
        <CardDescription>{filename}</CardDescription>
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

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Elapsed</p>
            <Duration
              duration={isPrinting ? elapsedSeconds : 0}
              className="font-medium text-xl"
              realTime={isPrinting}
            />
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
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
