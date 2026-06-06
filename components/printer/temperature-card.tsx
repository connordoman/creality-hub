import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTemperature } from "@/lib/creality/status";
import type { PrinterTelemetry } from "@/lib/creality/types";

interface TemperatureCardProps {
  telemetry: PrinterTelemetry;
}

function TempBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-none border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
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
          value={formatTemperature(
            telemetry.nozzleTemp,
            telemetry.targetNozzleTemp,
          )}
        />
        <TempBlock
          label="Bed"
          value={formatTemperature(telemetry.bedTemp0, telemetry.targetBedTemp0)}
        />
        <TempBlock
          label="Chamber"
          value={formatTemperature(
            telemetry.boxTemp,
            telemetry.targetBoxTemp,
          )}
        />
      </CardContent>
    </Card>
  );
}
