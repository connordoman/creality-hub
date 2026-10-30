"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrinterSettings } from "@/context/printer-settings";
import useGcodeLayers from "@/hooks/use-gcode-layers";
import { parseCurPosition } from "@/lib/creality/position";
import { getProgress } from "@/lib/creality/status";
import type { PrintStatus, PrinterTelemetry } from "@/lib/creality/types";
import { formatFileName } from "@/lib/fs";
import { layerAtZ } from "@/lib/gcode/layers";
import { BoxIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import type { GcodeViewMode } from "./gcode-viewer-canvas";

// three.js needs WebGL, so keep it out of the server render and the main bundle.
const GcodeViewerCanvas = dynamic(
  () =>
    import("./gcode-viewer-canvas").then((module) => module.GcodeViewerCanvas),
  { ssr: false, loading: () => <Skeleton className="size-full" /> },
);

const DEFAULT_BUILD_VOLUME = { x: 300, y: 300 };

interface GcodeViewerCardProps {
  telemetry: PrinterTelemetry;
  status: PrintStatus;
  className?: string;
}

export function GcodeViewerCard({
  telemetry,
  status,
  className,
}: GcodeViewerCardProps) {
  const { buildVolume } = usePrinterSettings();
  const filename = formatFileName(telemetry.printFileName);
  const { data: parsed, isPending, error } = useGcodeLayers(filename);

  const isActive = status === "printing" || status === "paused";
  const [chosenMode, setChosenMode] = useState<GcodeViewMode | null>(null);
  const mode = chosenMode ?? (isActive ? "live" : "full");

  // Z moves around during bed leveling and calibration, before any layer is
  // printed. Hold the live view on the first layer until progress is reported.
  const hasStartedPrinting = (getProgress(telemetry) ?? 0) > 0;
  const z = hasStartedPrinting
    ? parseCurPosition(telemetry.curPosition).z
    : null;
  const liveLayer = useMemo(() => {
    if (!parsed || !isActive) {
      return null;
    }
    if (z == null) {
      return parsed.layers.length > 0 ? 0 : null;
    }
    return layerAtZ(parsed, z);
  }, [parsed, isActive, z]);

  const volume = useMemo(
    () => ({
      x: buildVolume?.x ?? DEFAULT_BUILD_VOLUME.x,
      y: buildVolume?.y ?? DEFAULT_BUILD_VOLUME.y,
    }),
    [buildVolume?.x, buildVolume?.y],
  );

  let body: ReactNode;
  if (!filename) {
    body = <Message>No print file selected.</Message>;
  } else if (error) {
    body = <Message>Couldn&apos;t load the model: {error.message}</Message>;
  } else if (isPending || !parsed) {
    body = <Skeleton className="size-full" />;
  } else if (parsed.segmentCount === 0) {
    body = <Message>No printable moves found in this file.</Message>;
  } else {
    body = (
      <>
        <GcodeViewerCanvas
          parsed={parsed}
          mode={mode}
          liveLayer={liveLayer}
          buildVolume={volume}
          className="size-full"
        />
        <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-muted-foreground tabular-nums">
          {mode === "live" && liveLayer != null
            ? `Layer ${liveLayer + 1} / ${parsed.layers.length}`
            : `${parsed.layers.length} layers`}
        </p>
      </>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <BoxIcon className="size-4" />
          Model
        </CardTitle>
        <CardAction>
          <ButtonGroup>
            {(["live", "full"] as const).map((option) => (
              <Button
                key={option}
                size="xs"
                variant="outline"
                data-active={mode === option}
                aria-pressed={mode === option}
                className="data-active:border-primary/30! data-active:bg-primary/80!"
                onClick={() => setChosenMode(option)}
              >
                {option === "live" ? "Live" : "Full model"}
              </Button>
            ))}
          </ButtonGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-4/3 w-full overflow-hidden border border-border/60">
          {body}
        </div>
      </CardContent>
    </Card>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
