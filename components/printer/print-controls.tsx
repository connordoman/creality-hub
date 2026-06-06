"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { PrintStatus, PrinterCommand } from "@/lib/creality/types";
import { Pause, Play, SlidersVerticalIcon, Square } from "lucide-react";

interface PrintControlsProps {
  status: PrintStatus;
  onCommand: (command: PrinterCommand) => void;
}

export function PrintControls({ status, onCommand }: PrintControlsProps) {
  const isHydrated = useIsHydrated();
  const canPause = status === "printing";
  const canResume = status === "paused";
  const canStop =
    status === "printing" || status === "paused" || status === "self-testing";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersVerticalIcon className="size-4" />
          Print Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!isHydrated || !canPause}
          className="flex-1"
          onClick={() => onCommand("pause")}
        >
          <Pause data-icon="inline-start" />
          Pause
        </Button>
        <Button
          variant="outline"
          disabled={!isHydrated || !canResume}
          className="flex-1"
          onClick={() => onCommand("resume")}
        >
          <Play data-icon="inline-start" />
          Resume
        </Button>
        <Button
          variant="destructive"
          disabled={!isHydrated || !canStop}
          className="flex-1"
          onClick={() => onCommand("stop")}
        >
          <Square data-icon="inline-start" />
          Stop
        </Button>
      </CardContent>
    </Card>
  );
}
