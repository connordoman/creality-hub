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

interface StatusCardProps {
  status: PrintStatus;
  telemetry: PrinterTelemetry;
  elapsed: string;
  remaining: string;
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
  elapsed,
  remaining,
  elapsedSeconds,
  remainingSeconds,
}: StatusCardProps) {
  const progress = getProgress(telemetry) ?? 0;
  const filename = telemetry.printFileName?.trim() || "No active print";

  return (
    <Card>
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
              duration={elapsedSeconds}
              className="font-medium text-xl"
            />
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <Duration
              duration={remainingSeconds}
              className="font-medium text-xl"
              countDown
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
