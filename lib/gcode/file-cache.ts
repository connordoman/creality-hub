import "server-only";

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { createGunzip, createGzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

import { moonrakerUrl } from "@/lib/creality/config";
import { getDataDir } from "@/lib/settings/server";

/**
 * Gcode files can be tens of MB and the printer serves them slowly (~7 MB/s
 * over its Wi-Fi), so each version of a file is downloaded once, gzipped as it
 * streams in, and kept on disk. Only the most recent few are kept, which covers
 * the current print and the ones just before it.
 */
const MAX_CACHED_FILES = 5;
const GZIP_LEVEL = 6;

const gunzipAsync = promisify(gunzip);

/** Moonraker's metadata for a gcode file, or null if it has none. */
export async function fetchGcodeMetadata(
  printerHost: string,
  filename: string,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(
    moonrakerUrl(
      printerHost,
      `/server/files/metadata?filename=${encodeURIComponent(filename)}`,
    ),
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Moonraker metadata returned ${response.status}`);
  }

  const data = (await response.json()) as { result?: Record<string, unknown> };
  return data.result ?? null;
}

export interface GcodeFileVersion {
  printerHost: string;
  filename: string;
  size: number;
  modified: number;
}

/**
 * Builds a version from Moonraker file metadata, or null when the metadata
 * lacks what is needed to tell versions apart (then nothing is cached).
 */
export function gcodeFileVersion(
  printerHost: string,
  filename: string,
  metadata: Record<string, unknown> | null,
): GcodeFileVersion | null {
  const size = Number(metadata?.size ?? metadata?.file_size);
  const modified = Number(metadata?.modified);
  if (!Number.isFinite(size) || !Number.isFinite(modified)) {
    return null;
  }
  return { printerHost, filename, size, modified };
}

/** Strong HTTP ETag for a file version. */
export function gcodeFileEtag(version: GcodeFileVersion): string {
  return `"${versionHash(version).slice(0, 24)}"`;
}

function versionHash(version: GcodeFileVersion): string {
  return createHash("sha256")
    .update(
      [version.printerHost, version.filename, version.size, version.modified].join("\0"),
    )
    .digest("hex");
}

function cacheDir(): string {
  return path.join(getDataDir(), "gcode-cache");
}

function cachePath(version: GcodeFileVersion): string {
  return path.join(cacheDir(), `${versionHash(version)}.gcode.gz`);
}

// Route handlers can be bundled as separate module instances, so in-flight
// downloads are tracked on globalThis to make concurrent requests share one.
const inflightKey = Symbol.for("creality-hub.gcode-file-cache.inflight");
const globalStore = globalThis as typeof globalThis & {
  [inflightKey]?: Map<string, Promise<string>>;
};
const inflight = (globalStore[inflightKey] ??= new Map());

/**
 * Path to a gzipped copy of the file, downloading it from the printer first
 * if this version is not cached yet.
 */
export async function getCachedGcodeFile(
  version: GcodeFileVersion,
): Promise<string> {
  const target = cachePath(version);

  try {
    const now = new Date();
    // Touch it so eviction treats it as recently used.
    await fs.utimes(target, now, now);
    return target;
  } catch {
    // Not cached yet.
  }

  let pending = inflight.get(target);
  if (!pending) {
    pending = download(version, target).finally(() => inflight.delete(target));
    inflight.set(target, pending);
  }
  return pending;
}

async function download(
  version: GcodeFileVersion,
  target: string,
): Promise<string> {
  const response = await fetch(
    moonrakerUrl(
      version.printerHost,
      `/server/files/gcodes/${encodeURIComponent(version.filename)}`,
    ),
    { cache: "no-store" },
  );
  if (!response.ok || !response.body) {
    throw new GcodeFetchError(response.ok ? 502 : response.status);
  }

  await fs.mkdir(cacheDir(), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await pipeline(
      Readable.fromWeb(response.body as NodeWebReadableStream<Uint8Array>),
      createGzip({ level: GZIP_LEVEL }),
      createWriteStream(temp),
    );
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }

  await evictOldFiles().catch((error) => {
    console.error("Failed to evict cached gcode files:", error);
  });
  return target;
}

async function evictOldFiles() {
  const dir = cacheDir();
  const names = (await fs.readdir(dir)).filter((name) =>
    name.endsWith(".gcode.gz"),
  );
  if (names.length <= MAX_CACHED_FILES) {
    return;
  }

  const entries = await Promise.all(
    names.map(async (name) => {
      const file = path.join(dir, name);
      const stat = await fs.stat(file);
      return { file, mtime: stat.mtimeMs };
    }),
  );
  entries.sort((a, b) => b.mtime - a.mtime);
  await Promise.all(
    entries
      .slice(MAX_CACHED_FILES)
      .map(({ file }) => fs.rm(file, { force: true })),
  );
}

export class GcodeFetchError extends Error {
  constructor(readonly status: number) {
    super(`Moonraker returned ${status}`);
  }
}

/** The cached file as gzip bytes, streamed. */
export async function openCachedGcodeGzip(file: string) {
  const { size } = await fs.stat(file);
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
  return { stream, size };
}

/** The cached file decompressed, streamed. */
export function openCachedGcodePlain(file: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(
    createReadStream(file).pipe(createGunzip()),
  ) as ReadableStream<Uint8Array>;
}

/** The cached file as text. */
export async function readCachedGcodeText(file: string): Promise<string> {
  const bytes = await gunzipAsync(await fs.readFile(file));
  return bytes.toString("utf8");
}
