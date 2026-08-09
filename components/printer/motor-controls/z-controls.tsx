"use client";

import { Button } from "@/components/ui/button";
import { JogAxis, JogDirection } from "@/lib/creality/motor-commands";
import { cn } from "@/lib/utils";
import { HouseIcon, LayerArrowDownIcon, LayerArrowUpIcon } from "lucide-react";

interface ZControlsProps {
  disabled: boolean;
  stepSize?: number;
  className?: string;
  onJog: (axis: JogAxis, direction: JogDirection) => void;
  onHome: () => void;
}

export function ZControls({
  disabled,
  stepSize,
  className,
  onJog,
  onHome,
}: ZControlsProps) {
  return (
    <div className={cn("grid grid-cols-1 shrink-0", className)}>
      <Button
        variant="outline"
        size="icon-lg"
        disabled={disabled}
        onClick={() => onJog("z", 1)}
        aria-label={`Move Z axis up ${stepSize} mm`}
      >
        <LayerArrowUpIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        disabled={disabled}
        onClick={() => onHome()}
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
        disabled={disabled}
        onClick={() => onJog("z", -1)}
        aria-label={`Move Z axis down ${stepSize} mm`}
      >
        <LayerArrowDownIcon />
      </Button>
    </div>
  );
}
