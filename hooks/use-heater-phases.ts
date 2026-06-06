"use client";

import { HEATER_POLL_INTERVAL_MS } from "@/lib/creality/config";
import { fetchHeaterPhases } from "@/lib/creality/moonraker-client";
import type { HeaterPhases } from "@/lib/creality/types";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_PHASES: HeaterPhases = {
  nozzle: "static",
  bed: "static",
};

export function useHeaterPhases(pollIntervalMs = HEATER_POLL_INTERVAL_MS) {
  return useQuery({
    queryKey: ["heater-phases"],
    queryFn: async () => {
      return await fetchHeaterPhases();
    },
    initialData: DEFAULT_PHASES,
    staleTime: pollIntervalMs,
  });
}
