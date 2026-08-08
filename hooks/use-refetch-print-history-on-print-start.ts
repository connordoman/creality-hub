"use client";

import type { PrintStatus } from "@/lib/creality/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function useRefetchPrintHistoryOnPrintStart(status: PrintStatus) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<PrintStatus | null>(null);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (
      previousStatus != null &&
      previousStatus !== "printing" &&
      status === "printing"
    ) {
      void queryClient.invalidateQueries({ queryKey: ["print-history"] });
    }
  }, [status, queryClient]);
}
