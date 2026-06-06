"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { HistoryIcon, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { printHistoryColumns } from "./print-history-columns";
import { Spinner } from "../ui/spinner";

export function PrintHistory() {
  const [pagination, setPagination] = useState<PrintHistoryPagination>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading, error, refetch } = usePrintHistory(pagination);

  const pageCount = useMemo(
    () => Math.ceil((data?.totalCount ?? 0) / pagination.pageSize),
    [data?.totalCount, pagination.pageSize]
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <HistoryIcon className="size-4" />
          Print History
        </CardTitle>
        <CardDescription>
          {isLoading ? (
            <Spinner />
          ) : (data?.totalCount ?? 0) > 0 ? (
            `${data?.totalCount} total print${
              data?.totalCount === 1 ? "" : "s"
            }`
          ) : (
            ""
          )}
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>History unavailable</AlertTitle>
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        ) : null}

        <DataTable
          fillEmptyRows
          columns={printHistoryColumns}
          data={data?.jobs ?? []}
          pageCount={pageCount}
          totalCount={data?.totalCount ?? 0}
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
