import type { LayersWorkerResponse } from "@/lib/gcode/layers.worker";
import type { ParsedGcodeLayers } from "@/lib/gcode/layers";
import { useQuery } from "@tanstack/react-query";

function parseInWorker(url: string, signal: AbortSignal) {
  return new Promise<ParsedGcodeLayers>((resolve, reject) => {
    const worker = new Worker(
      new URL("../lib/gcode/layers.worker.ts", import.meta.url),
    );
    const finish = () => worker.terminate();

    signal.addEventListener("abort", () => {
      finish();
      reject(signal.reason);
    });
    worker.onmessage = (event: MessageEvent<LayersWorkerResponse>) => {
      finish();
      if (event.data.ok) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Gcode worker failed"));
    };
    worker.postMessage({ url });
  });
}

export default function useGcodeLayers(filename: string | undefined) {
  return useQuery<ParsedGcodeLayers>({
    queryKey: ["gcode-layers", filename],
    queryFn: ({ signal }) =>
      parseInWorker(
        new URL(
          `/api/printer/files/gcodes/${encodeURIComponent(filename!)}/raw`,
          window.location.origin,
        ).toString(),
        signal,
      ),
    enabled: Boolean(filename),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });
}
