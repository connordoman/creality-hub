import { parseGcodeLayers, type ParsedGcodeLayers } from "@/lib/gcode/layers";
import {
  loadStoredLayers,
  openLayersStore,
  storeLayers,
} from "@/lib/gcode/layers-store";

export type LayersWorkerRequest = { url: string; filename: string };
export type LayersWorkerResponse =
  | { ok: true; result: ParsedGcodeLayers; source: "network" | "stored" }
  | { ok: false; error: string };

// The project compiles with the DOM lib, where `self` is typed as a Window.
const ctx = self as unknown as Worker & { close(): void };

function transferables(result: ParsedGcodeLayers): ArrayBuffer[] {
  return [
    result.segments.buffer as ArrayBuffer,
    result.segmentTools.buffer as ArrayBuffer,
  ];
}

function reply(message: LayersWorkerResponse, transfer: ArrayBuffer[] = []) {
  ctx.postMessage(message, transfer);
}

ctx.onmessage = async (event: MessageEvent<LayersWorkerRequest>) => {
  const { url, filename } = event.data;
  const db = await openLayersStore();
  let pendingWrite: Promise<void> = Promise.resolve();

  try {
    const stored = db ? await loadStoredLayers(db, filename) : null;

    let response: Response;
    try {
      // no-store keeps the browser from answering the conditional request
      // itself, so a 304 reaches this code and the stored parse is reused.
      response = await fetch(url, {
        cache: "no-store",
        headers: stored ? { "If-None-Match": stored.etag } : undefined,
      });
    } catch (error) {
      if (stored) {
        // Server unreachable: the last parse of this file beats nothing.
        reply({ ok: true, result: stored.result, source: "stored" }, transferables(stored.result));
        return;
      }
      throw error;
    }

    if (response.status === 304 && stored) {
      reply({ ok: true, result: stored.result, source: "stored" }, transferables(stored.result));
      return;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch gcode (${response.status})`);
    }

    const result = parseGcodeLayers(await response.text());
    const etag = response.headers.get("ETag");
    if (db && etag) {
      pendingWrite = storeLayers(db, {
        filename,
        etag,
        storedAt: Date.now(),
        result,
      });
    }
    // Hand the buffers over instead of copying them.
    reply({ ok: true, result, source: "network" }, transferables(result));
  } catch (error) {
    reply({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse gcode",
    });
  } finally {
    // The page doesn't terminate this worker, so the write can finish.
    await pendingWrite;
    db?.close();
    ctx.close();
  }
};
