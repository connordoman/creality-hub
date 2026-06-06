"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CrealityWebRTCClient } from "@/lib/creality/webrtc-client";
import { Camera, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function CameraViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<CrealityWebRTCClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsLive(false);

    try {
      const client = new CrealityWebRTCClient();
      clientRef.current = client;

      const stream = await client.connect({
        onStream: (mediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setIsLive(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect camera";
      setError(message);
      await clientRef.current?.disconnect();
      clientRef.current = null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    void connect();

    return () => {
      void clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [connect]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="size-4" />
          Chamber Camera
        </CardTitle>
        <CardDescription>WebRTC stream from port 8000</CardDescription>
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
            <AlertTitle>Camera error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          disabled={isConnecting}
          onClick={() => void connect()}
        >
          <RefreshCw data-icon="inline-start" />
          {isConnecting ? "Connecting..." : "Reconnect"}
        </Button>
      </CardContent>
    </Card>
  );
}
