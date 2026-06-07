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
import { useMutation } from "@tanstack/react-query";
import { AlertCircleIcon, CctvIcon, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/spinner";

export function CameraViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<CrealityWebRTCClient | null>(null);
  const connectedRef = useRef(false);
  const [isLive, setIsLive] = useState(false);

  const {
    mutate: connect,
    isPending: isConnecting,
    isError,
    error,
  } = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: () => {
      setIsLive(true);
    },
    onMutate: () => {
      setIsLive(false);
      connectedRef.current = true;
    },
    onError: (error) => {
      console.error(error);
      void clientRef.current?.disconnect();
      connectedRef.current = false;
    },
  });

  useEffect(() => {
    if (connectedRef.current) return;

    void connect();

    return () => {
      void clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [connect]);

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
            onClick={() => void connect()}
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

        {isError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Camera error</AlertTitle>
            <AlertDescription>
              {error?.message || "Failed to connect camera"}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
