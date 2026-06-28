"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getPrinterCommandPendingValue,
  PrinterCommandContext,
  usePrinterCommandMutation,
} from "@/hooks/use-printer-command";
import {
  chamberLightCommand,
  getChamberLightDisplayState,
} from "@/lib/creality/printer-commands";
import { PrinterTelemetry } from "@/lib/creality/types";
import { startTransition, useOptimistic } from "react";
import { Lightbulb } from "../lightbulb";

interface ChamberLightOptionProps {
  telemetry: PrinterTelemetry;
  commandContext: PrinterCommandContext;
  disabled?: boolean;
}

export function ChamberLightOption({
  telemetry,
  commandContext,
  disabled = false,
}: ChamberLightOptionProps) {
  const chamberLightMutation = usePrinterCommandMutation(
    commandContext,
    chamberLightCommand
  );

  const chamberLightOn = getChamberLightDisplayState(
    telemetry,
    getPrinterCommandPendingValue(
      chamberLightMutation.isPending,
      chamberLightMutation.variables
    )
  );

  const [displayOn, setDisplayOn] = useOptimistic(
    chamberLightOn,
    (_current, next: boolean) => next
  );

  return (
    <Label className="w-full flex items-center justify-between cursor-pointer">
      <span className="text-sm text-muted-foreground">Chamber light</span>
      <Switch
        checked={displayOn}
        size="lg"
        disabled={chamberLightMutation.isPending || disabled}
        onCheckedChange={(checked) => {
          startTransition(() => {
            setDisplayOn(checked);
          });
          chamberLightMutation.mutate(checked);
        }}
      />
    </Label>
  );
}
