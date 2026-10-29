/** `#RRGGBB` (uppercase), or null when the slicer left the slot unset. */
export type FilamentColor = string | null;

const HEX_COLOR_RE = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i;

// Slicers write their full config as `; key = value` comments. OrcaSlicer and
// PrusaSlicer separate per-filament values with `;`.
const FILAMENT_COLOR_KEYS = ["filament_colour", "filament_color"];
const EXTRUDER_COLOR_KEYS = ["extruder_colour", "extruder_color"];

// The config block sits at the end of the file (Orca/Prusa); some slicers put
// it in the header instead, so only the edges are scanned.
const SCAN_WINDOW = 512 * 1024;

export function normalizeHexColor(value: string): FilamentColor {
  const match = value.trim().replace(/^["']|["']$/g, "").match(HEX_COLOR_RE);
  return match ? `#${match[1].toUpperCase()}` : null;
}

function readConfigValue(region: string, keys: string[]): string | null {
  let found: string | null = null;
  for (const key of keys) {
    const re = new RegExp(`^;\\s*${key}\\s*=\\s*(.*)$`, "gim");
    for (const match of region.matchAll(re)) {
      // The last occurrence wins if a file somehow repeats a key.
      found = match[1];
    }
    if (found != null) {
      return found;
    }
  }
  return null;
}

function parseColorList(value: string): FilamentColor[] {
  return value.split(";").map(normalizeHexColor);
}

/**
 * Colors declared in the slicer, indexed by filament/tool number (T0, T1, ...).
 * Returns null when the file carries no color information at all.
 */
export function parseFilamentColors(gcode: string): FilamentColor[] | null {
  const regions =
    gcode.length <= SCAN_WINDOW * 2
      ? [gcode]
      : [gcode.slice(-SCAN_WINDOW), gcode.slice(0, SCAN_WINDOW)];

  let filament: FilamentColor[] | null = null;
  let extruder: FilamentColor[] | null = null;

  for (const region of regions) {
    filament ??= parseOptional(readConfigValue(region, FILAMENT_COLOR_KEYS));
    extruder ??= parseOptional(readConfigValue(region, EXTRUDER_COLOR_KEYS));
  }

  if (!filament && !extruder) {
    return null;
  }

  // Filament colors take priority; extruder colors only fill the gaps.
  const length = Math.max(filament?.length ?? 0, extruder?.length ?? 0);
  const merged = Array.from(
    { length },
    (_, i) => filament?.[i] ?? extruder?.[i] ?? null,
  );

  return merged.some((color) => color != null) ? merged : null;
}

function parseOptional(value: string | null): FilamentColor[] | null {
  return value == null ? null : parseColorList(value);
}
