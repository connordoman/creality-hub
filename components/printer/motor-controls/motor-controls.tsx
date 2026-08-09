"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  HouseIcon,
  LayerArrowDownIcon,
  LayerArrowUpIcon,
  Move3dIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { ButtonGroup } from "../../ui/button-group";
import { Button } from "../../ui/button";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PrinterCommandContext } from "@/hooks/use-printer-command";
import type { PrinterTelemetry } from "@/lib/creality/types";
import {
  buildHomeParams,
  buildJogParams,
  isHoming,
  type HomeAxes,
  type JogAxis,
  type JogDirection,
} from "@/lib/creality/motor-commands";
import {
  canJogXY,
  canJogZ,
  formatAxisPosition,
  parseAutohomeStatus,
  parseCurPosition,
} from "@/lib/creality/position";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { ValueToggle } from "../../ui/value-toggle";
import { XYControls } from "./xy-controls";
import { ZControls } from "./z-controls";
import { PrintCoordinates } from "./print-coordinates";

const STEP_SIZES = [1, 10, 50] as const;

type StepSize = (typeof STEP_SIZES)[number];

interface MotorControlsProps {
  telemetry: PrinterTelemetry;
  commandContext: PrinterCommandContext;
  enabled?: boolean;
  className?: string;
}

export default function MotorControls({
  telemetry,
  commandContext,
  enabled = true,
  className,
}: MotorControlsProps) {
  const [stepSize, setStepSize] = useState<StepSize>(1);
  const isHydrated = useIsHydrated();

  const homed = useMemo(
    () => parseAutohomeStatus(telemetry.autohome),
    [telemetry.autohome],
  );
  const controlsDisabled = !isHydrated || !enabled || isHoming(telemetry);
  const xyJogDisabled = controlsDisabled || !canJogXY(homed);
  const zJogDisabled = controlsDisabled || !canJogZ(homed);

  const jog = (axis: JogAxis, direction: JogDirection) => {
    commandContext.sendSetParams(buildJogParams(axis, stepSize, direction));
  };

  const home = (axes: HomeAxes) => {
    commandContext.sendSetParams(buildHomeParams(axes));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move3dIcon className="size-4" />
          Motor Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <div className="flex flex-col max-w-xs justify-center w-full">
          <ValueToggle
            items={STEP_SIZES as unknown as number[]}
            value={stepSize}
            unit="mm"
            onChange={(value) => setStepSize(value as StepSize)}
          />
          <div className="flex flex-row items-center mt-6 mb-2 justify-around mx-auto w-full">
            <div className="w-2/3 flex flex-col items-center">
              <XYControls
                disabled={xyJogDisabled}
                stepSize={stepSize}
                onJog={jog}
                onHome={() => home("xy")}
              />
            </div>

            <div className="w-1/3 flex flex-col items-center">
              <ZControls
                disabled={zJogDisabled}
                stepSize={stepSize}
                onJog={jog}
                onHome={() => home("z")}
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="">
        <PrintCoordinates telemetry={telemetry} className="mx-auto" />
      </CardFooter>
    </Card>
  );
}
