import { moonrakerUrl, MOONRAKER_PORT, PRINTER_HOST } from "@/lib/creality/config";
import { NextRequest, NextResponse } from "next/server";

interface MoonrakerTotalsResponse {
  result?: {
    job_totals?: {
      total_jobs?: number;
    };
  };
}

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit") ?? "10";
  const start = request.nextUrl.searchParams.get("start") ?? "0";
  const listUrl = moonrakerUrl(
    PRINTER_HOST,
    `/server/history/list?limit=${encodeURIComponent(limit)}&start=${encodeURIComponent(start)}&order=desc`,
  );
  const totalsUrl = moonrakerUrl(PRINTER_HOST, "/server/history/totals");

  try {
    const [listResponse, totalsResponse] = await Promise.all([
      fetch(listUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      fetch(totalsUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
    ]);

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: `Moonraker returned ${listResponse.status}` },
        { status: listResponse.status },
      );
    }

    const listData = (await listResponse.json()) as {
      result?: {
        count?: number;
        jobs?: unknown[];
        total_jobs?: number;
      };
    };

    let totalJobs = listData.result?.count ?? listData.result?.jobs?.length ?? 0;

    if (totalsResponse.ok) {
      const totalsData = (await totalsResponse.json()) as MoonrakerTotalsResponse;
      const fromTotals = totalsData.result?.job_totals?.total_jobs;
      if (typeof fromTotals === "number" && Number.isFinite(fromTotals)) {
        totalJobs = fromTotals;
      }
    }

    return NextResponse.json({
      ...listData,
      result: {
        ...listData.result,
        total_jobs: totalJobs,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach printer";
    return NextResponse.json(
      {
        error: message,
        host: PRINTER_HOST,
        port: MOONRAKER_PORT,
      },
      { status: 502 },
    );
  }
}
