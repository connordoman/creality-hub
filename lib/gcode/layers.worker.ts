import { parseGcodeLayers, type ParsedGcodeLayers } from "@/lib/gcode/layers";

export type LayersWorkerRequest = { url: string };
export type LayersWorkerResponse =
  | { ok: true; result: ParsedGcodeLayers }
  | { ok: false; error: string };

// The project compiles with the DOM lib, where `self` is typed as a Window.
const ctx = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<LayersWorkerRequest>) => {
  try {
    const response = await fetch(event.data.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch gcode (${response.status})`);
    }
    const result = parseGcodeLayers(await response.text());
    const message: LayersWorkerResponse = { ok: true, result };
    // Hand the buffers over instead of copying them.
    ctx.postMessage(message, [
      result.segments.buffer as ArrayBuffer,
      result.segmentTools.buffer as ArrayBuffer,
    ]);
  } catch (error) {
    const message: LayersWorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse gcode",
    };
    ctx.postMessage(message);
  }
};
