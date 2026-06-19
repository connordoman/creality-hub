"use client";

import { Badge } from "@/components/ui/badge";
import { formatFilamentUsed } from "@/lib/creality/status";
import type { PrintHistoryJob } from "@/lib/creality/types";
import type { ColumnDef } from "@tanstack/react-table";
import { Duration } from "../ui/duration";
import { DateTime } from "../ui/datetime";

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
    cell: ({ row }) => <DateTime date={Number(row.getValue("startTime"))} />,
  },
  {
    accessorKey: "durationSeconds",
    header: "Duration",
    cell: ({ row }) => {
      const duration = Number(row.getValue("durationSeconds")) ?? 0;
      if (duration === 0) {
        return "\u2014:\u2014:\u2014";
      }
      return <Duration duration={duration} realTime={false} />;
    },
  },
  {
    id: "filamentUsed",
    header: "Filament",
    cell: ({ row }) => {
      const { length, weight } = formatFilamentUsed(
        row.original.filamentUsedMm,
        row.original.filamentUsedG
      );

      return (
        <span>
          {`${length?.value?.toFixed(2) ?? "\u2014"} ${length?.unit ?? "m"} · ${
            weight?.value?.toFixed(1) ?? "\u2014"
          } ${weight?.unit ?? "g"}`}
        </span>
      );
    },
  },
];
