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
} from "../ui/card";
import { ButtonGroup } from "../ui/button-group";
import { Button } from "../ui/button";
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
  const position = useMemo(
    () => parseCurPosition(telemetry.curPosition),
    [telemetry.curPosition],
  );
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
      <CardContent>
        <div className="flex flex-col">
          <ButtonGroup className="flex justify-stretch w-full">
            {STEP_SIZES.map((size) => (
              <Button
                variant="outline"
                size="xs"
                key={size}
                onClick={() => setStepSize(size)}
                disabled={stepSize === size}
                className={cn("flex-1")}
              >
                {size} mm
              </Button>
            ))}
          </ButtonGroup>
          <div className="flex flex-row items-center mt-6 mb-2">
            <div className="basis-2/3">
              <div className="grid grid-cols-3 gap-0 items-center justify-items-center w-fit mx-auto">
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="col-start-2 row-start-1"
                  disabled={xyJogDisabled}
                  onClick={() => jog("y", 1)}
                  aria-label={`Move Y axis forward ${stepSize} mm`}
                >
                  <ArrowUpIcon />
                </Button>

                <Button
                  variant="outline"
                  size="icon-lg"
                  className="col-start-1 row-start-2"
                  disabled={xyJogDisabled}
                  onClick={() => jog("x", -1)}
                  aria-label={`Move X axis left ${stepSize} mm`}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="col-start-2 row-start-2"
                  disabled={controlsDisabled}
                  onClick={() => home("xy")}
                  aria-label="Home X and Y axes"
                >
                  <span className="relative inline-block">
                    <HouseIcon />
                    <span className="absolute -bottom-1.5 -right-1.5 px-1 rounded-full bg-zinc-900 text-[0.4rem]">
                      XY
                    </span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="col-start-3 row-start-2"
                  disabled={xyJogDisabled}
                  onClick={() => jog("x", 1)}
                  aria-label={`Move X axis right ${stepSize} mm`}
                >
                  <ArrowRightIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="col-start-2 row-start-3"
                  disabled={xyJogDisabled}
                  onClick={() => jog("y", -1)}
                  aria-label={`Move Y axis back ${stepSize} mm`}
                >
                  <ArrowDownIcon />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 -translate-x-1/2">
              <Button
                variant="outline"
                size="icon-lg"
                disabled={zJogDisabled}
                onClick={() => jog("z", 1)}
                aria-label={`Move Z axis up ${stepSize} mm`}
              >
                <LayerArrowUpIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                disabled={controlsDisabled}
                onClick={() => home("z")}
                aria-label="Home Z axis"
              >
                <span className="relative inline-block">
                  <HouseIcon />
                  <span className="absolute -bottom-1.5 -right-1.5 px-1 rounded-full bg-zinc-900 text-[0.4rem]">
                    Z
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                disabled={zJogDisabled}
                onClick={() => jog("z", -1)}
                aria-label={`Move Z axis down ${stepSize} mm`}
              >
                <LayerArrowDownIcon />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="">
        <div className="flex flex-row items-center gap-2">
          <span>
            <strong>X: </strong>
            {formatAxisPosition(position.x)}
          </span>
          <span>
            <strong>Y: </strong>
            {formatAxisPosition(position.y)}
          </span>
          <span>
            <strong>Z: </strong>
            {formatAxisPosition(position.z)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
