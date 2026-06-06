"use client";

import { Badge } from "@/components/ui/badge";
import { formatFilamentUsed } from "@/lib/creality/status";
import type { PrintHistoryJob } from "@/lib/creality/types";
import type { ColumnDef } from "@tanstack/react-table";
import { Duration } from "../ui/duration";

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null || !Number.isFinite(timestamp)) {
    return "--";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  completed: "default",
  printing: "default",
  cancelled: "destructive",
  canceled: "destructive",
  error: "destructive",
  interrupted: "outline",
  in_progress: "secondary",
};

export const printHistoryColumns: ColumnDef<PrintHistoryJob>[] = [
  {
    accessorKey: "filename",
    header: "File",
    cell: ({ row }) => (
      <span className="block max-w-[280px] truncate font-medium">
        {row.getValue("filename")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = String(row.getValue("status"));
      return (
        <Badge
          variant={statusVariant[status] ?? "secondary"}
          className="capitalize"
        >
          {status.replaceAll("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "startTime",
    header: "Started",
    cell: ({ row }) => formatTimestamp(row.getValue("startTime")),
  },
  {
    accessorKey: "durationSeconds",
    header: "Duration",
    cell: ({ row }) => (
      <Duration
        duration={row.getValue("durationSeconds") ?? 0}
        realTime={false}
      />
    ),
  },
  {
    id: "filamentUsed",
    header: "Filament",
    cell: ({ row }) =>
      formatFilamentUsed(
        row.original.filamentUsedMm,
        row.original.filamentUsedG
      ),
  },
];
