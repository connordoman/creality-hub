"use client";

import { fetchPrintHistoryPage } from "@/lib/creality/moonraker-client";
import type { PrintHistoryJob } from "@/lib/creality/types";
import { useCallback, useEffect, useState } from "react";

export interface PrintHistoryPagination {
  pageIndex: number;
  pageSize: number;
}

export function usePrintHistory(pagination: PrintHistoryPagination) {
  const [jobs, setJobs] = useState<PrintHistoryJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const page = await fetchPrintHistoryPage({
        limit: pagination.pageSize,
        start: pagination.pageIndex * pagination.pageSize,
      });
      setJobs(page.jobs);
      setTotalCount(page.totalCount);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load print history";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { jobs, totalCount, isLoading, error, refresh };
}
