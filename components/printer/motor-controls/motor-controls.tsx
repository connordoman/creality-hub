"use client";

import { Move3dIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PrinterCommandContext } from "@/hooks/use-printer-command";
import type { PrinterTelemetry } from "@/lib/creality/types";
import { usePrinterSettings } from "@/context/printer-settings";
import {
  DEFAULT_BUILD_VOLUME,
  DEFAULT_MOTOR_STEP_SIZES,
  PERCENT_STEP_SIZES,
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
  formatStepSize,
  parseCurPosition,
  resolveStepMm,
  type StepSize,
} from "@/lib/creality/position";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { ValueToggle } from "../../ui/value-toggle";
import { XYControls } from "./xy-controls";
import { ZControls } from "./z-controls";
import { PrintCoordinates } from "./print-coordinates";
import { Separator } from "@/components/ui/separator";

const STEP_UNITS: StepSize["unit"][] = ["mm", "%"];

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
  // Percent steps need a known build volume to resolve against.
  const percentStepsAvailable = buildVolume !== undefined;
  const [step, setStep] = useState<StepSize>({
    unit: "mm",
    value: stepSizes[0],
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep((current) => {
      if (current.unit === "%") {
        return percentStepsAvailable
          ? current
          : { unit: "mm", value: stepSizes[0] };
      }

      return stepSizes.includes(current.value)
        ? current
        : { unit: "mm", value: stepSizes[0] };
    });
  }, [stepSizes, percentStepsAvailable]);

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
      !canJogWithinBuildVolume(
        position,
        volume,
        axis,
        direction,
        resolveStepMm(step, volume, axis),
      ),
    [position, volume, step],
  );

  const jog = (axis: JogAxis, direction: JogDirection) => {
    const clampedStep = clampJogDistance(
      position,
      volume,
      axis,
      direction,
      resolveStepMm(step, volume, axis),
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
          <div className="flex flex-row items-start gap-2">
            {percentStepsAvailable && (
              <ValueToggle
                className="mb-1 w-fit"
                items={STEP_UNITS}
                value={step.unit}
                unit=""
                onChange={(unit) =>
                  setStep(
                    unit === "mm"
                      ? { unit, value: stepSizes[0] }
                      : { unit, value: PERCENT_STEP_SIZES[0] },
                  )
                }
              />
            )}
            <Separator orientation="vertical" className="h-4 mt-1" />
            <div className="flex-1">
              {step.unit === "mm" ? (
                <ValueToggle
                  items={stepSizes}
                  value={step.value}
                  unit="mm"
                  onChange={(value) => setStep({ unit: "mm", value })}
                />
              ) : (
                <ValueToggle
                  items={PERCENT_STEP_SIZES}
                  value={step.value}
                  unit="%"
                  onChange={(value) => setStep({ unit: "%", value })}
                />
              )}
            </div>
          </div>
          <div className="flex flex-row items-center mt-6 mb-2 justify-around mx-auto w-full">
            <div className="w-1/2 flex flex-col items-center">
              <XYControls
                jogDisabled={xyJogDisabled}
                homeDisabled={controlsDisabled}
                stepLabel={formatStepSize(step)}
                isJogDisabled={isJogDisabled}
                onJog={jog}
                onHome={() => home("xy")}
              />
            </div>

            <div className="w-1/2 flex flex-col items-center">
              <ZControls
                jogDisabled={zJogDisabled}
                homeDisabled={controlsDisabled}
                stepLabel={formatStepSize(step)}
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
