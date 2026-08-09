"use client";

import { WrenchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ChamberLightOption } from "./options/chamber-light-option";
import { PrinterTelemetry } from "@/lib/creality/types";
import { PrinterCommandContext } from "@/hooks/use-printer-command";
import { cn } from "@/lib/utils";

interface PrinterOptionsProps {
  telemetry: PrinterTelemetry;
  commandContext: PrinterCommandContext;
  isConnected: boolean;
  className?: string;
}

export function PrinterOptions({
  telemetry,
  commandContext,
  isConnected,
  className,
}: PrinterOptionsProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WrenchIcon className="size-4" /> Printer Options
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChamberLightOption
          telemetry={telemetry}
          commandContext={commandContext}
          disabled={!isConnected}
        />
      </CardContent>
    </Card>
  );
}
