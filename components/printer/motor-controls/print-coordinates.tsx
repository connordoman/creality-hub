"use client";

import { formatAxisPosition, parseCurPosition } from "@/lib/creality/position";
import { PrinterTelemetry } from "@/lib/creality/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface PrintCoordinatesProps {
  telemetry: PrinterTelemetry;
  className?: string;
}

export function PrintCoordinates({
  telemetry,
  className,
}: PrintCoordinatesProps) {
  const position = useMemo(
    () => parseCurPosition(telemetry.curPosition),
    [telemetry.curPosition],
  );

  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center justify-items-center  text-sm whitespace-nowrap w-full",
        className,
      )}
    >
      <p>
        <strong className="mr-3">X</strong>
        {formatAxisPosition(position.x)}
      </p>
      <p>
        <strong className="mr-3">Y</strong>
        {formatAxisPosition(position.y)}
      </p>
      <p>
        <strong className="mr-3">Z</strong>
        {formatAxisPosition(position.z)}
      </p>
    </div>
  );
}
