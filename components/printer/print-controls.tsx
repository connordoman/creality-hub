"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrintStatus, PrinterCommand } from "@/lib/creality/types";
import { Pause, Play, Square } from "lucide-react";

interface PrintControlsProps {
  status: PrintStatus;
  onCommand: (command: PrinterCommand) => void;
}

export function PrintControls({ status, onCommand }: PrintControlsProps) {
  const canPause = status === "printing";
  const canResume = status === "paused";
  const canStop =
    status === "printing" || status === "paused" || status === "self-testing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Print Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!canPause}
          className="flex-1"
          onClick={() => onCommand("pause")}
        >
          <Pause data-icon="inline-start" />
          Pause
        </Button>
        <Button
          variant="outline"
          disabled={!canResume}
          className="flex-1"
          onClick={() => onCommand("resume")}
        >
          <Play data-icon="inline-start" />
          Resume
        </Button>
        <Button
          variant="destructive"
          disabled={!canStop}
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
