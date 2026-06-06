"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  totalCount: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  isLoading?: boolean;
  fillEmptyRows?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalCount,
  pagination,
  onPaginationChange,
  isLoading = false,
  fillEmptyRows = false,
}: DataTableProps<TData, TValue>) {
  const isHydrated = useIsHydrated();

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: { pagination },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      onPaginationChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const { pageIndex, pageSize } = pagination;
  const from = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalCount);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageCount > 0 && pageIndex + 1 < pageCount;
  const prevDisabled = !isHydrated || !canPreviousPage;
  const nextDisabled = !isHydrated || !canNextPage;
  const emptyRows = fillEmptyRows
    ? Math.max(pageSize - table.getRowModel().rows.length, 0)
    : 0;

  const setPageIndex = (nextPageIndex: number) => {
    onPaginationChange({ ...pagination, pageIndex: nextPageIndex });
  };

  const setPageSize = (nextPageSize: number) => {
    onPaginationChange({ pageIndex: 0, pageSize: nextPageSize });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-none border border-border/60">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((_, columnIndex) => (
                    <TableCell key={`skeleton-${index}-${columnIndex}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {Array.from({ length: emptyRows }).map((_, index) => (
                  <TableRow key={`empty-${index}`}>
                    {columns.map((_, columnIndex) => (
                      <TableCell
                        key={`empty-${index}-${columnIndex}`}
                        className="h-[37px]"
                      >
                        &nbsp;
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No print history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount === 0
            ? "No rows to display"
            : `Showing ${from}\u2013${to} of ${totalCount}`}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                if (value === null) return;
                setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Page {pageCount === 0 ? 0 : pageIndex + 1} of{" "}
              {Math.max(pageCount, 1)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPageIndex(0)}
                disabled={prevDisabled}
              >
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={prevDisabled}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={nextDisabled}
              >
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={nextDisabled}
              >
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
