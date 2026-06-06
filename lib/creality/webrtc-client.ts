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
      { once: true },
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
  const filteredFormats = mLineParts.slice(3).filter((part) => part !== skipPayload);
  lines[mLineIndex] = [...mLineParts.slice(0, 3), ...filteredFormats].join(" ");

  const filteredLines = lines.filter((line) => {
    if (line.startsWith(`a=rtpmap:${skipPayload}`)) return false;
    if (line.startsWith(`a=fmtp:${skipPayload}`)) return false;
    if (line.includes("x-google")) return false;
    return true;
  });

  return filteredLines.join("\r\n");
}

export interface CrealityWebRTCOptions {
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

export class CrealityWebRTCClient {
  private pc: RTCPeerConnection | null = null;

  async connect(options: CrealityWebRTCOptions = {}): Promise<MediaStream> {
    await this.disconnect();

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc = pc;

    const streamPromise = new Promise<MediaStream>((resolve, reject) => {
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          options.onStream?.(stream);
          resolve(stream);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          reject(new Error("WebRTC connection failed"));
        }
      };
    });

    pc.addTransceiver("video", { direction: "recvonly" });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    const localDescription = pc.localDescription;
    if (!localDescription?.sdp) {
      throw new Error("Failed to create WebRTC offer");
    }

    const encodedOffer = btoa(
      JSON.stringify({
        type: localDescription.type,
        sdp: localDescription.sdp,
      }),
    );

    const response = await fetch("/api/printer/webrtc", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: encodedOffer,
    });

    if (!response.ok) {
      throw new Error(`WebRTC signaling failed (${response.status})`);
    }

    const encodedAnswer = await response.text();
    const answer = JSON.parse(atob(encodedAnswer)) as RTCSessionDescriptionInit;
    answer.sdp = fixCrealitySdp(answer.sdp ?? "");

    await pc.setRemoteDescription(answer);

    try {
      return await Promise.race([
        streamPromise,
        new Promise<MediaStream>((_, reject) =>
          setTimeout(() => reject(new Error("Timed out waiting for camera stream")), 10_000),
        ),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "WebRTC connection failed";
      options.onError?.(new Error(message));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pc) return;

    this.pc.getReceivers().forEach((receiver) => receiver.track?.stop());
    this.pc.close();
    this.pc = null;
  }
}
