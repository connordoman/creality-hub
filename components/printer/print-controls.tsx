"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { PrintStatus, PrinterCommand } from "@/lib/creality/types";
import { Pause, Play, Square, SquareIcon, ToggleRightIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { startTransition, useEffect, useState } from "react";
import { Spinner } from "../ui/spinner";
import { cn } from "@/lib/utils";

interface PrintControlsProps {
  status: PrintStatus;
  onCommand: (command: PrinterCommand) => void;
  className?: string;
}

export function PrintControls({
  status,
  onCommand,
  className,
}: PrintControlsProps) {
  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    if (!isStopping) {
      return;
    }

    if (status !== "printing") {
      startTransition(() => {
        setIsStopping(false);
        setShowConfirmStop(false);
      });
    }
  }, [status, isStopping]);

  const handleStop = () => {
    onCommand("stop");
    setIsStopping(true);
  };

  const isHydrated = useIsHydrated();
  const canPause = status === "printing";
  const canResume = status === "paused";
  const canStop =
    status === "printing" || status === "paused" || status === "self-testing";

  return (
    <Card className={cn("flex-1 w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleRightIcon className="size-4" />
          Print Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="@container flex gap-2 items-start flex-1">
        <Button
          variant="outline"
          disabled={!isHydrated || !canPause}
          className="flex-1"
          onClick={() => onCommand("pause")}
        >
          <Pause data-icon="inline-start" />
          <span className="hidden @sm:inline">Pause</span>
        </Button>
        <Button
          variant="outline"
          disabled={!isHydrated || !canResume}
          className="flex-1"
          onClick={() => onCommand("resume")}
        >
          <Play data-icon="inline-start" />
          <span className="hidden @sm:inline">Resume</span>
        </Button>

        <Button
          variant="destructive"
          disabled={!isHydrated || !canStop}
          className="flex-1"
          onClick={() => setShowConfirmStop(true)}
        >
          <Square data-icon="inline-start" />
          <span className="hidden @sm:inline">Stop</span>
        </Button>
        <AlertDialog open={showConfirmStop} onOpenChange={setShowConfirmStop}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-1">
                Stop Print
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to stop the print?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isStopping}
                onClick={handleStop}
              >
                {isStopping ? (
                  <Spinner className="size-4" />
                ) : (
                  <SquareIcon className="size-4 inline-block" />
                )}
                Stop Print
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
