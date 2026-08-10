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
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PrinterCommandContext } from "@/hooks/use-printer-command";
import type { PrinterTelemetry } from "@/lib/creality/types";
import { usePrinterSettings } from "@/context/printer-settings";
import {
  DEFAULT_BUILD_VOLUME,
  DEFAULT_MOTOR_STEP_SIZES,
} from "@/lib/settings/validation";
import {
  buildHomeParams,
  buildJogParams,
  canMotorControl,
  isHoming,
  type HomeAxes,
  type JogAxis,
  type JogDirection,
} from "@/lib/creality/motor-commands";
import {
  canJogWithinBuildVolume,
  canJogXY,
  canJogZ,
  clampJogDistance,
  parseAutohomeStatus,
  parseCurPosition,
} from "@/lib/creality/position";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { ValueToggle } from "../../ui/value-toggle";
import { XYControls } from "./xy-controls";
import { ZControls } from "./z-controls";
import { PrintCoordinates } from "./print-coordinates";

interface MotorControlsProps {
  telemetry: PrinterTelemetry;
  commandContext: PrinterCommandContext;
  isConnected: boolean;
  className?: string;
}

export default function MotorControls({
  telemetry,
  commandContext,
  isConnected,
  className,
}: MotorControlsProps) {
  const { motorStepSizes, buildVolume } = usePrinterSettings();
  const stepSizes = useMemo(
    () => motorStepSizes ?? [...DEFAULT_MOTOR_STEP_SIZES],
    [motorStepSizes],
  );
  const volume = useMemo(
    () => buildVolume ?? { ...DEFAULT_BUILD_VOLUME },
    [buildVolume],
  );
  const [stepSize, setStepSize] = useState(stepSizes[0]);

  useEffect(() => {
    setStepSize((current) =>
      stepSizes.includes(current) ? current : stepSizes[0],
    );
  }, [stepSizes]);

  const isHydrated = useIsHydrated();

  const homed = useMemo(
    () => parseAutohomeStatus(telemetry.autohome),
    [telemetry.autohome],
  );
  const position = useMemo(
    () => parseCurPosition(telemetry.curPosition),
    [telemetry.curPosition],
  );
  const controlsDisabled =
    !isHydrated ||
    !isConnected ||
    !canMotorControl(telemetry) ||
    isHoming(telemetry);
  const xyJogDisabled = controlsDisabled || !canJogXY(homed);
  const zJogDisabled = controlsDisabled || !canJogZ(homed);

  const isJogDisabled = useCallback(
    (axis: JogAxis, direction: JogDirection) =>
      !canJogWithinBuildVolume(position, volume, axis, direction, stepSize),
    [position, volume, stepSize],
  );

  const jog = (axis: JogAxis, direction: JogDirection) => {
    const clampedStep = clampJogDistance(
      position,
      volume,
      axis,
      direction,
      stepSize,
    );

    if (clampedStep === null) {
      return;
    }

    commandContext.sendSetParams(buildJogParams(axis, clampedStep, direction));
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
            items={stepSizes}
            value={stepSize}
            unit="mm"
            onChange={setStepSize}
          />
          <div className="flex flex-row items-center mt-6 mb-2 justify-around mx-auto w-full">
            <div className="w-1/2 flex flex-col items-center">
              <XYControls
                jogDisabled={xyJogDisabled}
                homeDisabled={controlsDisabled}
                stepSize={stepSize}
                isJogDisabled={isJogDisabled}
                onJog={jog}
                onHome={() => home("xy")}
              />
            </div>

            <div className="w-1/2 flex flex-col items-center">
              <ZControls
                jogDisabled={zJogDisabled}
                homeDisabled={controlsDisabled}
                stepSize={stepSize}
                isJogDisabled={isJogDisabled}
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
