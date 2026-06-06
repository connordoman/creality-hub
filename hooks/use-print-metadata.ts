"use client";

import { fetchPrintMetadata } from "@/lib/creality/moonraker-client";
import type { PrintFileMetadata } from "@/lib/creality/types";
import { useQuery } from "@tanstack/react-query";

const EMPTY_METADATA: PrintFileMetadata = {
  filamentTotalMm: null,
  filamentTotalG: null,
  estimatedTimeSeconds: null,
};

export function usePrintMetadata(filename: string | undefined) {
  return useQuery({
    queryKey: ["print-metadata", filename],
    queryFn: async () => {
      if (!filename) return null;
      return await fetchPrintMetadata(filename);
    },
    enabled: Boolean(filename),
    placeholderData: EMPTY_METADATA,
    staleTime: 1000 * 60 * 5,
  });
}
