"use client";

import { Button } from "@/components/ui/button";
import { JogAxis, JogDirection } from "@/lib/creality/motor-commands";
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  HouseIcon,
} from "lucide-react";

interface XYControlsProps {
  disabled: boolean;
  stepSize?: number;
  className?: string;
  onJog: (axis: JogAxis, direction: JogDirection) => void;
  onHome: () => void;
}

export function XYControls({
  disabled,
  stepSize,
  className,
  onJog,
  onHome,
}: XYControlsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-0 items-center justify-items-center w-max aspect-square",
        className,
      )}
    >
      <Button
        variant="outline"
        size="icon-lg"
        className="col-start-2 row-start-1"
        disabled={disabled}
        onClick={() => onJog("y", 1)}
        aria-label={`Move Y axis forward ${stepSize} mm`}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        className="col-start-1 row-start-2"
        disabled={disabled}
        onClick={() => onJog("x", -1)}
        aria-label={`Move X axis left ${stepSize} mm`}
      >
        <ArrowLeftIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        className="col-start-2 row-start-2"
        disabled={disabled}
        onClick={() => onHome()}
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
        disabled={disabled}
        onClick={() => onJog("x", 1)}
        aria-label={`Move X axis right ${stepSize} mm`}
      >
        <ArrowRightIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        className="col-start-2 row-start-3"
        disabled={disabled}
        onClick={() => onJog("y", -1)}
        aria-label={`Move Y axis back ${stepSize} mm`}
      >
        <ArrowDownIcon />
      </Button>
    </div>
  );
}
