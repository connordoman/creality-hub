"use client";

import { formatAxisPosition, parseCurPosition } from "@/lib/creality/position";
import { PrinterTelemetry } from "@/lib/creality/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface PrintCoordinatesProps {
  telemetry: PrinterTelemetry;
  className?: string;
  vertical?: boolean;
  columned?: boolean;
  colored?: boolean;
}

export function PrintCoordinates({
  telemetry,
  className,
  vertical = false,
  columned = false,
  colored = false,
}: PrintCoordinatesProps) {
  const position = useMemo(
    () => parseCurPosition(telemetry.curPosition),
    [telemetry.curPosition],
  );

  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center justify-items-center  text-sm whitespace-nowrap w-full [&>p]:text-xs",
        vertical && "grid-cols-1",
        columned
          ? "[&>p]:flex [&>p]:flex-col [&>p]:items-center [&>p]:justify-center [&>p]:gap-0.5"
          : "[&>p>strong]:mr-3",
        colored &&
          "[&>p]:nth-1:text-red-700 [&>p]:nth-2:text-green-700 [&>p]:nth-3:text-blue-700",
        className,
      )}
    >
      <p>
        <strong>X</strong>
        {formatAxisPosition(position.x)}
      </p>
      <p>
        <strong>Y</strong>
        {formatAxisPosition(position.y)}
      </p>
      <p>
        <strong>Z</strong>
        {formatAxisPosition(position.z)}
      </p>
    </div>
  );
}
