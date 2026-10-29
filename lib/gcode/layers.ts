import {
  normalizeHexColor,
  parseFilamentColors,
  type FilamentColor,
} from "@/lib/gcode/colors";

export interface GcodeLayer {
  index: number;
  z: number;
  height: number;
  /** 1-based, inclusive. */
  startLine: number;
  endLine: number;
  /** Offsets into the file, comparable with Moonraker's `file_position`. */
  startByte: number;
  endByte: number;
  /** Range into `ParsedGcodeLayers.segments` (in segments, end exclusive). */
  segmentStart: number;
  segmentEnd: number;
  /** Tools that extruded during this layer. */
  tools: number[];
}

export interface GcodeFilamentChange {
  layer: number | null;
  line: number;
  tool: number;
  color: FilamentColor;
  reason: "tool-change" | "filament-change";
}

export interface ParsedGcodeLayers {
  layers: GcodeLayer[];
  /** Four floats per extruding segment: x0, y0, x1, y1. Z is the layer's. */
  segments: Float32Array;
  /** Tool index of each segment. */
  segmentTools: Uint8Array;
  segmentCount: number;
  filamentColors: FilamentColor[] | null;
  filamentChanges: GcodeFilamentChange[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    maxZ: number;
  };
}

const WORD_RE = /([XYZEFIJ])\s*(-?(?:\d+\.?\d*|\.\d+))/gi;
const LAYER_MARKER_RE = /^;\s*(?:LAYER_CHANGE|LAYER:\d+)/im;
const TOOL_RE = /^T(\d+)(?!\w)/i;
const COLOR_CHANGE_RE = /^;\s*COLOR_CHANGE\s*,\s*T(\d+)\s*,\s*(#[0-9a-f]{6})/i;
const ARC_STEP_RADIANS = Math.PI / 18; // 10 degrees
const Z_EPSILON = 1e-4;

class GrowableFloats {
  data = new Float32Array(1 << 16);
  length = 0;

  push4(a: number, b: number, c: number, d: number) {
    if (this.length + 4 > this.data.length) {
      const next = new Float32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
    this.data[this.length++] = d;
  }
}

class GrowableBytes {
  data = new Uint8Array(1 << 14);
  length = 0;

  push(value: number) {
    if (this.length + 1 > this.data.length) {
      const next = new Uint8Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = value;
  }
}

const roundMm = (value: number) => Math.round(value * 1e4) / 1e4;

const NON_ASCII_RE = /[^\x00-\x7f]/;
const encoder = new TextEncoder();

export function parseGcodeLayers(gcode: string): ParsedGcodeLayers {
  const lines = gcode.split("\n");
  const exactBytes = NON_ASCII_RE.test(gcode);
  const markerMode = LAYER_MARKER_RE.test(gcode);
  const filamentColors = parseFilamentColors(gcode);

  const floats = new GrowableFloats();
  const toolBytes = new GrowableBytes();
  const layers: GcodeLayer[] = [];
  const filamentChanges: GcodeFilamentChange[] = [];
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    maxZ: 0,
  };

  // Machine state
  let x = 0;
  let y = 0;
  let z = 0;
  let e = 0;
  let absolutePosition = true;
  let relativeExtrusion = false;
  let tool = 0;
  let seenToolCommand = false;

  // Layer state
  // Held in a box so TypeScript doesn't narrow it across the closures below.
  const box: { open: GcodeLayer | null } = { open: null };
  let pendingHeight: number | null = null;
  let previousZ = 0;
  const openTools = new Set<number>();

  const colorFor = (index: number): FilamentColor =>
    filamentColors?.[index] ?? null;

  function closeLayer(endLine: number, endByte: number) {
    if (!box.open) {
      return;
    }
    box.open.endLine = endLine;
    box.open.endByte = endByte;
    box.open.segmentEnd = toolBytes.length;
    box.open.tools = [...openTools].sort((a, b) => a - b);
    if (!Number.isFinite(box.open.z)) {
      box.open.z = z;
    }
    box.open.z = roundMm(box.open.z);
    box.open.height = roundMm(
      pendingHeight ?? Math.max(box.open.z - previousZ, 0),
    );
    previousZ = box.open.z;
    bounds.maxZ = Math.max(bounds.maxZ, box.open.z);
    layers.push(box.open);
    box.open = null;
    openTools.clear();
  }

  function openLayer(line: number, byte: number) {
    box.open = {
      index: layers.length,
      z: NaN,
      height: 0,
      startLine: line,
      endLine: line,
      startByte: byte,
      endByte: byte,
      segmentStart: toolBytes.length,
      segmentEnd: toolBytes.length,
      tools: [],
    };
    pendingHeight = null;
  }

  function addSegment(x0: number, y0: number, x1: number, y1: number) {
    floats.push4(x0, y0, x1, y1);
    toolBytes.push(tool);
    openTools.add(tool);
    bounds.minX = Math.min(bounds.minX, x0, x1);
    bounds.maxX = Math.max(bounds.maxX, x0, x1);
    bounds.minY = Math.min(bounds.minY, y0, y1);
    bounds.maxY = Math.max(bounds.maxY, y0, y1);
  }

  function emitExtrusion(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    arc: { cx: number; cy: number; clockwise: boolean } | null,
    line: number,
    byte: number,
  ) {
    if (!markerMode) {
      // Without layer comments, a layer starts when extrusion moves to a new Z.
      if (!box.open || Math.abs(z - box.open.z) > Z_EPSILON) {
        closeLayer(line - 1, byte);
        openLayer(line, byte);
        box.open!.z = z;
      }
    }
    if (!box.open) {
      return; // Start G-code (purge lines etc.) before the first layer.
    }
    const current = box.open;
    if (!Number.isFinite(current.z)) {
      current.z = z;
    }

    if (!arc) {
      addSegment(x0, y0, x1, y1);
      return;
    }

    const radius = Math.hypot(x0 - arc.cx, y0 - arc.cy);
    const a0 = Math.atan2(y0 - arc.cy, x0 - arc.cx);
    let sweep = Math.atan2(y1 - arc.cy, x1 - arc.cx) - a0;
    if (arc.clockwise && sweep >= 0) {
      sweep -= 2 * Math.PI;
    } else if (!arc.clockwise && sweep <= 0) {
      sweep += 2 * Math.PI;
    }
    // A full circle comes through as identical start and end points.
    if (Math.hypot(x1 - x0, y1 - y0) < 1e-6) {
      sweep = arc.clockwise ? -2 * Math.PI : 2 * Math.PI;
    }

    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / ARC_STEP_RADIANS));
    let px = x0;
    let py = y0;
    for (let i = 1; i <= steps; i++) {
      const angle = a0 + (sweep * i) / steps;
      const nx = i === steps ? x1 : arc.cx + radius * Math.cos(angle);
      const ny = i === steps ? y1 : arc.cy + radius * Math.sin(angle);
      addSegment(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }

  let byteOffset = 0;

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const lineNumber = index + 1;
    const lineStartByte = byteOffset;
    byteOffset += (exactBytes ? encoder.encode(raw).length : raw.length) + 1;

    const line = raw.trimStart();
    if (line === "") {
      continue;
    }

    if (line.charCodeAt(0) === 59 /* ; */) {
      if (markerMode && /^;\s*(?:LAYER_CHANGE|LAYER:\d+)/i.test(line)) {
        closeLayer(lineNumber - 1, lineStartByte);
        openLayer(lineNumber, lineStartByte);
      } else if (box.open && /^;\s*Z:/i.test(line)) {
        const value = Number(line.slice(line.indexOf(":") + 1));
        if (Number.isFinite(value)) {
          box.open.z = value;
        }
      } else if (box.open && /^;\s*HEIGHT:/i.test(line)) {
        const value = Number(line.slice(line.indexOf(":") + 1));
        if (Number.isFinite(value)) {
          pendingHeight = value;
        }
      } else {
        const colorChange = line.match(COLOR_CHANGE_RE);
        if (colorChange) {
          const color = normalizeHexColor(colorChange[2]);
          filamentChanges.push({
            layer: box.open ? box.open.index : null,
            line: lineNumber,
            tool: Number(colorChange[1]),
            color,
            reason: "filament-change",
          });
        }
      }
      continue;
    }

    const commentStart = line.indexOf(";");
    const code = commentStart === -1 ? line : line.slice(0, commentStart);
    const head = code.slice(0, 4).toUpperCase();

    const toolMatch = code.match(TOOL_RE);
    if (toolMatch) {
      const next = Number(toolMatch[1]);
      if (next !== tool || !seenToolCommand) {
        filamentChanges.push({
          layer: box.open ? box.open.index : null,
          line: lineNumber,
          tool: next,
          color: colorFor(next),
          reason: "tool-change",
        });
      }
      tool = next;
      seenToolCommand = true;
      continue;
    }

    if (/^M600(?!\d)/i.test(code) || /^FILAMENT_CHANGE(?!\w)/i.test(code)) {
      filamentChanges.push({
        layer: box.open ? box.open.index : null,
        line: lineNumber,
        tool,
        color: null,
        reason: "filament-change",
      });
      continue;
    }

    if (/^M82(?!\d)/i.test(code)) {
      relativeExtrusion = false;
      continue;
    }
    if (/^M83(?!\d)/i.test(code)) {
      relativeExtrusion = true;
      continue;
    }
    if (/^G90(?!\d)/i.test(code)) {
      absolutePosition = true;
      continue;
    }
    if (/^G91(?!\d)/i.test(code)) {
      absolutePosition = false;
      continue;
    }

    const isArc = /^G0?[23](?!\d)/i.test(head);
    const isMove = isArc || /^G0?[01](?!\d)/i.test(head);
    const isSetPosition = /^G92(?!\d)/i.test(head);
    if (!isMove && !isSetPosition) {
      continue;
    }

    let wordX: number | undefined;
    let wordY: number | undefined;
    let wordZ: number | undefined;
    let wordE: number | undefined;
    let wordI = 0;
    let wordJ = 0;
    for (const word of code.matchAll(WORD_RE)) {
      const value = Number(word[2]);
      switch (word[1].toUpperCase()) {
        case "X": wordX = value; break;
        case "Y": wordY = value; break;
        case "Z": wordZ = value; break;
        case "E": wordE = value; break;
        case "I": wordI = value; break;
        case "J": wordJ = value; break;
      }
    }

    if (isSetPosition) {
      if (wordE !== undefined) e = wordE;
      if (wordX !== undefined) x = wordX;
      if (wordY !== undefined) y = wordY;
      if (wordZ !== undefined) z = wordZ;
      continue;
    }

    const x0 = x;
    const y0 = y;
    if (wordX !== undefined) x = absolutePosition ? wordX : x + wordX;
    if (wordY !== undefined) y = absolutePosition ? wordY : y + wordY;
    if (wordZ !== undefined) z = absolutePosition ? wordZ : z + wordZ;

    let extrudedLength = 0;
    if (wordE !== undefined) {
      extrudedLength = relativeExtrusion ? wordE : wordE - e;
      e = relativeExtrusion ? e : wordE;
    }

    const moved = Math.abs(x - x0) > 1e-9 || Math.abs(y - y0) > 1e-9;
    if (extrudedLength > 0 && (moved || isArc)) {
      emitExtrusion(
        x0,
        y0,
        x,
        y,
        isArc
          ? {
              cx: x0 + wordI,
              cy: y0 + wordJ,
              clockwise: /^G0?2(?!\d)/i.test(head),
            }
          : null,
        lineNumber,
        lineStartByte,
      );
    }
  }

  closeLayer(lines.length, byteOffset);

  const hasSegments = floats.length > 0;
  if (!hasSegments) {
    bounds.minX = bounds.maxX = bounds.minY = bounds.maxY = 0;
  }

  return {
    layers,
    segments: floats.data.slice(0, floats.length),
    segmentTools: toolBytes.data.slice(0, toolBytes.length),
    segmentCount: toolBytes.length,
    filamentColors,
    filamentChanges,
    bounds,
  };
}

/** Index of the layer containing `byte`, or null if outside every layer. */
export function layerAtByte(
  parsed: ParsedGcodeLayers,
  byte: number,
): number | null {
  const { layers } = parsed;
  let lo = 0;
  let hi = layers.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (byte < layers[mid].startByte) {
      hi = mid - 1;
    } else if (byte >= layers[mid].endByte) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }
  return null;
}

/** Index of the highest layer whose Z is at or below `z` (with tolerance). */
export function layerAtZ(parsed: ParsedGcodeLayers, z: number): number | null {
  const { layers } = parsed;
  let result: number | null = null;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].z <= z + 0.05) {
      result = i;
    } else {
      break;
    }
  }
  return result;
}
