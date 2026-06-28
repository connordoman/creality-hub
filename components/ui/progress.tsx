"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface ProgressProps extends ProgressPrimitive.Root.Props {
  indications?: {
    percentage: number;
    label: React.ReactNode | undefined;
  }[];
}

function Progress({
  className,
  children,
  value,
  indications,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      {indications ? (
        <div className="relative w-full">
          {indications.map((indication, index) => {
            return (
              <div
                key={`${indication.percentage}-${index}`}
                className="absolute translate-x-[-50%] bottom-0 z-10"
                style={{ left: `${indication.percentage}%` }}
              >
                <div className="absolute left-1/2 -bottom-4 w-px bg-foreground h-4.5 " />
                <Badge variant="outline" className="text-xs">
                  {indication.label}
                </Badge>
              </div>
            );
          })}
        </div>
      ) : null}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-none bg-muted",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  );
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-xs", className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-xs text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  );
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};
