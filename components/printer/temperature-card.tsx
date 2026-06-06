import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTemperature } from "@/lib/temperature";
import type { PrinterTelemetry } from "@/lib/creality/types";

interface TempBlockProps {
  label: string;
  current: number | undefined;
  target: number | undefined;
}

function TempBlock({ label, current, target }: TempBlockProps) {
  return (
    <div className="rounded-none border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium">{formatTemperature(current)}</p>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Temperatures</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
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
