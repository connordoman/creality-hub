"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { PrinterTelemetry } from "@/lib/creality/types";
import { Lightbulb } from "./lightbulb";

interface ChamberLightProps {
  telemetry: PrinterTelemetry;
  onToggle: (enabled: boolean) => void;
}

export function ChamberLight({ telemetry, onToggle }: ChamberLightProps) {
  const isOn = telemetry.lightSw === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb on={isOn} className="size-4" />
          Chamber Light
        </CardTitle>
        <CardDescription>Toggle the built-in chamber LED</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {isOn ? "On" : "Off"}
        </span>
        <Switch
          checked={isOn}
          onCheckedChange={(checked) => onToggle(checked)}
        />
      </CardContent>
    </Card>
  );
}
