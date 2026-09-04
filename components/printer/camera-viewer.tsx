"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CrealityWebRTCClient } from "@/lib/creality/webrtc-client";
import {
  AlertCircleIcon,
  CctvIcon,
  ExpandIcon,
  RefreshCw,
  ShrinkIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/spinner";
import { cn } from "@/lib/utils";
import { ChamberLightOption } from "./options/chamber-light-option";
import { PrinterCommandContext } from "@/hooks/use-printer-command";
import { PrinterTelemetry } from "@/lib/creality/types";

interface ActiveCameraConnection {
  client: CrealityWebRTCClient;
  controller: AbortController;
}

interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

interface FullscreenCapableDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
}

// iOS Safari has no element-level Fullscreen API — only <video> supports
// this non-standard native fullscreen player.
interface IOSFullscreenVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
}

type FullscreenMode = "none" | "element" | "video";

const CONTROLS_HIDE_DELAY_MS = 3000;

interface CameraViewerProps {
  className?: string;
  telemetry: PrinterTelemetry;
  commandContext: PrinterCommandContext;
  isConnected: boolean;
}

export function CameraViewer({
  className,
  telemetry,
  commandContext,
  isConnected,
}: CameraViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<ActiveCameraConnection | null>(null);
  const generationRef = useRef(0);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isConnecting, setIsConnecting] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>("none");

  const runConnection = useCallback(async (generation: number) => {
    const previousConnection = connectionRef.current;
    previousConnection?.controller.abort();
    await previousConnection?.client.disconnect();
    if (connectionRef.current === previousConnection) {
      connectionRef.current = null;
    }

    if (generation !== generationRef.current) return;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const client = new CrealityWebRTCClient();
    const controller = new AbortController();
    const connection = { client, controller };
    connectionRef.current = connection;

    try {
      const stream = await client.connect({
        signal: controller.signal,
        onStream: (mediaStream) => {
          if (
            generation !== generationRef.current ||
            connectionRef.current !== connection ||
            !videoRef.current
          ) {
            return;
          }
          videoRef.current.srcObject = mediaStream;
        },
      });

      if (
        generation !== generationRef.current ||
        connectionRef.current !== connection
      ) {
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setIsLive(true);
    } catch (err) {
      if (generation !== generationRef.current) return;

      const message =
        err instanceof Error ? err.message : "Failed to connect camera";
      if (message === "Connection aborted") return;

      console.error(err);
      await client.disconnect();
      if (connectionRef.current === connection) {
        connectionRef.current = null;
      }
      setError(message);
    } finally {
      if (
        generation === generationRef.current &&
        connectionRef.current === connection
      ) {
        setIsConnecting(false);
      }
    }
  }, []);

  const reconnect = useCallback(() => {
    const generation = ++generationRef.current;
    setIsConnecting(true);
    setIsLive(false);
    setError(null);
    void runConnection(generation);
  }, [runConnection]);

  useEffect(() => {
    const generation = ++generationRef.current;
    const connectTimer = setTimeout(() => {
      void runConnection(generation);
    }, 0);

    return () => {
      try {
        clearTimeout(connectTimer);
        generationRef.current += 1;
        const connection = connectionRef.current;
        connection?.controller.abort();
        void connection?.client.disconnect();
        connectionRef.current = null;
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to disconnect camera",
        );
      }
    };
  }, [runConnection]);

  useEffect(() => {
    const doc = document as FullscreenCapableDocument;

    const handleFullscreenChange = () => {
      const fullscreenElement = doc.fullscreenElement ?? doc.webkitFullscreenElement;
      setFullscreenMode(fullscreenElement === viewerRef.current ? "element" : "none");
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleBegin = () => setFullscreenMode("video");
    const handleEnd = () => setFullscreenMode("none");

    video.addEventListener("webkitbeginfullscreen", handleBegin);
    video.addEventListener("webkitendfullscreen", handleEnd);

    return () => {
      video.removeEventListener("webkitbeginfullscreen", handleBegin);
      video.removeEventListener("webkitendfullscreen", handleEnd);
    };
  }, []);

  useEffect(() => {
    if (fullscreenMode !== "element") return;

    const showControls = () => overlayRef.current?.classList.remove("opacity-0");
    const hideControls = () => overlayRef.current?.classList.add("opacity-0");

    const scheduleHide = () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      hideControlsTimerRef.current = setTimeout(
        hideControls,
        CONTROLS_HIDE_DELAY_MS,
      );
    };

    const handleActivity = () => {
      showControls();
      scheduleHide();
    };

    const node = viewerRef.current;
    node?.addEventListener("mousemove", handleActivity);
    node?.addEventListener("mouseenter", handleActivity);
    scheduleHide();

    return () => {
      node?.removeEventListener("mousemove", handleActivity);
      node?.removeEventListener("mouseenter", handleActivity);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
    };
  }, [fullscreenMode]);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as FullscreenCapableDocument;
    const container = viewerRef.current as FullscreenCapableElement | null;
    const video = videoRef.current as IOSFullscreenVideoElement | null;
    if (!container) return;

    const supportsElementFullscreen = Boolean(
      document.fullscreenEnabled ?? doc.webkitFullscreenEnabled,
    );

    try {
      if (supportsElementFullscreen) {
        const fullscreenElement = doc.fullscreenElement ?? doc.webkitFullscreenElement;
        if (fullscreenElement === container) {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          }
        } else if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
      } else if (video?.webkitEnterFullscreen) {
        // iOS Safari: no element Fullscreen API, fall back to the video's
        // native fullscreen player.
        if (video.webkitDisplayingFullscreen) {
          video.webkitExitFullscreen?.();
        } else {
          video.webkitEnterFullscreen();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <Card className={cn("flex-1", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CctvIcon className="size-4" />
          Chamber Camera
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {fullscreenMode !== "none" ? <ShrinkIcon /> : <ExpandIcon />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={viewerRef}
          className={cn(
            "group relative aspect-video overflow-hidden border border-border/60 bg-black",
            fullscreenMode === "element" &&
              "flex aspect-auto size-full items-center justify-center",
          )}
        >
          {isConnecting && !isLive ? (
            <Skeleton className="absolute inset-0 rounded-none" />
          ) : null}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-contain"
          />
          {!isLive && !isConnecting ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Camera offline
            </div>
          ) : null}

          {fullscreenMode === "element" ? (
            <div
              ref={overlayRef}
              className="absolute inset-x-0 top-0 flex items-center justify-between p-4 transition-opacity duration-300 bg-linear-to-b from-black/60 to-transparent"
            >
              <div className="flex items-center gap-2 text-sm text-white">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    isLive ? "bg-green-500" : "bg-muted-foreground",
                  )}
                />
                {isLive ? "Live" : "Offline"}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={toggleFullscreen}
              >
                <ShrinkIcon />
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Camera error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="items-center flex-1 justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={isConnecting}
          onClick={reconnect}
        >
          {isConnecting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          {isConnecting ? "Connecting..." : "Reconnect"}
        </Button>
        <ChamberLightOption
          telemetry={telemetry}
          commandContext={commandContext}
          disabled={!isConnected}
          className=" gap-3 w-fit"
        />
      </CardFooter>
    </Card>
  );
}
