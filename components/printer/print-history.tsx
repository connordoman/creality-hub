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
import { DataTable } from "@/components/ui/data-table";
import {
  usePrintHistory,
  type PrintHistoryPagination,
} from "@/hooks/use-print-history";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { printHistoryColumns } from "./print-history-columns";

export function PrintHistory() {
  const [pagination, setPagination] = useState<PrintHistoryPagination>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { jobs, totalCount, isLoading, error, refresh } =
    usePrintHistory(pagination);

  const pageCount = useMemo(
    () => Math.ceil(totalCount / pagination.pageSize),
    [totalCount, pagination.pageSize]
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Print History</CardTitle>
          <CardDescription>
            Paginated job history from Moonraker
            {totalCount > 0 ? ` · ${totalCount} total jobs` : ""}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={isLoading}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>History unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DataTable
          fillEmptyRows
          columns={printHistoryColumns}
          data={jobs}
          pageCount={pageCount}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={(next) =>
            setPagination({
              pageIndex: next.pageIndex,
              pageSize: next.pageSize,
            })
          }
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
