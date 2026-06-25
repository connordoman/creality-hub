function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3_000);

    pc.addEventListener(
      "icegatheringstatechange",
      () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          resolve();
        }
      },
      { once: true }
    );
  });
}

function fixCrealitySdp(sdp: string): string {
  const lines = sdp.split("\r\n");
  const mLineIndex = lines.findIndex((line) => line.startsWith("m=video"));
  if (mLineIndex === -1) return sdp;

  const mLineParts = lines[mLineIndex].split(" ");
  if (mLineParts.length < 4) return sdp;

  const skipPayload = mLineParts[3];
  const filteredFormats = mLineParts
    .slice(3)
    .filter((part) => part !== skipPayload);
  lines[mLineIndex] = [...mLineParts.slice(0, 3), ...filteredFormats].join(" ");

  const filteredLines = lines.filter((line) => {
    if (line.startsWith(`a=rtpmap:${skipPayload}`)) return false;
    if (line.startsWith(`a=fmtp:${skipPayload}`)) return false;
    if (line.includes("x-google")) return false;
    return true;
  });

  return filteredLines.join("\r\n");
}

function connectionAbortedError(): Error {
  return new Error("Connection aborted");
}

export interface CrealityWebRTCOptions {
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export class CrealityWebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private rejectPending: ((error: Error) => void) | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  async connect(options: CrealityWebRTCOptions = {}): Promise<MediaStream> {
    await this.disconnect();

    if (options.signal?.aborted) {
      throw connectionAbortedError();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc = pc;

    let abortHandler: (() => void) | null = null;
    const abortPromise = new Promise<never>((_, reject) => {
      abortHandler = () => {
        if (this.pc === pc) {
          void this.disconnect();
        } else {
          pc.close();
        }
        reject(connectionAbortedError());
      };

      options.signal?.addEventListener("abort", abortHandler, { once: true });
    });

    const abortable = async <T>(promise: Promise<T>): Promise<T> => {
      if (!options.signal) return promise;
      if (options.signal.aborted) throw connectionAbortedError();
      return Promise.race([promise, abortPromise]);
    };

    try {
      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await abortable(pc.createOffer());
      await abortable(pc.setLocalDescription(offer));
      await abortable(waitForIceGathering(pc));

      const localDescription = pc.localDescription;
      if (!localDescription?.sdp) {
        throw new Error("Failed to create WebRTC offer");
      }

      const encodedOffer = btoa(
        JSON.stringify({
          type: localDescription.type,
          sdp: localDescription.sdp,
        })
      );

      const response = await abortable(
        fetch("/api/printer/webrtc", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: encodedOffer,
          signal: options.signal,
        })
      );

      if (!response.ok) {
        throw new Error(`WebRTC signaling failed (${response.status})`);
      }

      const encodedAnswer = await abortable(response.text());
      const answer = JSON.parse(
        atob(encodedAnswer)
      ) as RTCSessionDescriptionInit;
      answer.sdp = fixCrealitySdp(answer.sdp ?? "");

      let settled = false;
      const streamPromise = new Promise<MediaStream>((resolve, reject) => {
        const settle = (handler: () => void) => {
          if (settled) return;
          settled = true;
          this.rejectPending = null;
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }
          handler();
        };

        this.rejectPending = (error) => {
          settle(() => reject(error));
        };

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          const mediaStream = stream ?? new MediaStream([event.track]);
          options.onStream?.(mediaStream);
          settle(() => resolve(mediaStream));
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") {
            settle(() => reject(new Error("WebRTC connection failed")));
          }
        };
      });
      void streamPromise.catch(() => undefined);

      await abortable(pc.setRemoteDescription(answer));

      return await abortable(
        Promise.race([
          streamPromise,
          new Promise<MediaStream>((_, reject) => {
            this.timeoutId = setTimeout(() => {
              reject(new Error("Timed out waiting for camera stream"));
            }, 15_000);
          }),
        ])
      );
    } catch (error) {
      await this.disconnect();
      const message =
        error instanceof Error ? error.message : "WebRTC connection failed";
      options.onError?.(new Error(message));
      throw error;
    } finally {
      if (abortHandler) {
        options.signal?.removeEventListener("abort", abortHandler);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.rejectPending) {
      this.rejectPending(new Error("Connection aborted"));
      this.rejectPending = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const pc = this.pc;
    this.pc = null;
    if (!pc) return;

    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.getReceivers().forEach((receiver) => receiver.track?.stop());
    pc.close();
  }
}
