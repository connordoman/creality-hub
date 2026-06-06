"use client";

import { fetchPrintHistoryPage } from "@/lib/creality/moonraker-client";
import { useQuery } from "@tanstack/react-query";

export interface PrintHistoryPagination {
  pageIndex: number;
  pageSize: number;
}

export function usePrintHistory(pagination: PrintHistoryPagination) {
  return useQuery({
    queryKey: ["print-history", pagination],
    queryFn: async () => {
      const page = await fetchPrintHistoryPage({
        limit: pagination.pageSize,
        start: pagination.pageIndex * pagination.pageSize,
      });
      return page;
    },
    placeholderData: {
      jobs: [],
      totalCount: 0,
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
