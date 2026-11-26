import { readAppVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appVersion = await readAppVersion();

  return NextResponse.json({ version: appVersion ?? "x.y.z" });
}
