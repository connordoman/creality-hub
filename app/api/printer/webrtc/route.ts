import { webrtcSignalingUrl } from "@/lib/creality/config";
import { getPrinterHost } from "@/lib/settings/server";
import { NextRequest, NextResponse } from "next/server";

const WEBRTC_SIGNALING_TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  const body = await request.text();

  if (!body) {
    return NextResponse.json({ error: "Missing WebRTC offer body" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, WEBRTC_SIGNALING_TIMEOUT_MS);
  const abortRequest = () => {
    controller.abort();
  };

  request.signal.addEventListener("abort", abortRequest, { once: true });

  try {
    const printerHost = await getPrinterHost();
    const response = await fetch(webrtcSignalingUrl(printerHost), {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `WebRTC signaling returned ${response.status}` },
        { status: response.status },
      );
    }

    const answer = await response.text();
    return new NextResponse(answer, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    if (controller.signal.aborted && !request.signal.aborted) {
      return NextResponse.json(
        { error: "Timed out reaching printer camera" },
        { status: 504 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to reach printer camera";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortRequest);
  }
}
