import type { GcodeAnalysis } from "@/lib/gcode/parse";
import { useQuery } from "@tanstack/react-query";

export default function useGcodeAnalysis(filename: string | undefined) {
  return useQuery<GcodeAnalysis>({
    queryKey: ["gcode-analysis", filename],
    queryFn: async () => {
      const response = await fetch(
        `/api/printer/files/gcodes/${encodeURIComponent(filename!)}/analyze`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch gcode analysis (${response.status})`);
      }
      return response.json();
    },
    enabled: Boolean(filename),
    staleTime: 1000 * 60 * 60 * 24,
    retry: false,
  });
}
