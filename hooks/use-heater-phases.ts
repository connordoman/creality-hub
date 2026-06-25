"use client";

import { HEATER_POLL_INTERVAL_MS } from "@/lib/creality/config";
import { fetchHeaterPhases } from "@/lib/creality/moonraker-client";
import type { HeaterPhases } from "@/lib/creality/types";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_PHASES: HeaterPhases = {
  nozzle: "static",
  bed: "static",
  raw: {
    nozzle: undefined,
    bed: undefined,
  },
};

export function useHeaterPhases(
  pollIntervalMs = HEATER_POLL_INTERVAL_MS,
  enabled = true
) {
  return useQuery({
    queryKey: ["heater-phases"],
    queryFn: async () => {
      const data = await fetchHeaterPhases();
      console.log(JSON.stringify(data, null, 2));
      return data;
    },
    initialData: DEFAULT_PHASES,
    staleTime: pollIntervalMs,
    enabled,
  });
}
