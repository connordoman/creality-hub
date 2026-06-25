"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CrealityWebRTCClient } from "@/lib/creality/webrtc-client";
import { AlertCircleIcon, CctvIcon, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/spinner";

interface ActiveCameraConnection {
  client: CrealityWebRTCClient;
  controller: AbortController;
}

export function CameraViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<ActiveCameraConnection | null>(null);
  const generationRef = useRef(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          err instanceof Error ? err.message : "Failed to disconnect camera"
        );
      }
    };
  }, [runConnection]);

  return (
    <Card className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CctvIcon className="size-4" />
          Chamber Camera
        </CardTitle>
        <CardAction>
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
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative aspect-video overflow-hidden border border-border/60 bg-black">
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
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Camera error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
