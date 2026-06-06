import { webrtcSignalingUrl } from "@/lib/creality/config";
import { getPrinterHost } from "@/lib/settings/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();

  if (!body) {
    return NextResponse.json({ error: "Missing WebRTC offer body" }, { status: 400 });
  }

  try {
    const printerHost = await getPrinterHost();
    const response = await fetch(webrtcSignalingUrl(printerHost), {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body,
      cache: "no-store",
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
    const message =
      error instanceof Error ? error.message : "Failed to reach printer camera";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
