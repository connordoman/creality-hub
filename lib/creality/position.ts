import type { BuildVolume } from "@/lib/settings/types";
import type { JogAxis, JogDirection } from "./motor-commands";

export interface AxisPosition {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface AxisHomedStatus {
  x: boolean | null;
  y: boolean | null;
  z: boolean | null;
}

export function parseCurPosition(value: unknown): AxisPosition {
  if (typeof value !== "string") {
    return { x: null, y: null, z: null };
  }

  const readAxis = (axis: "X" | "Y" | "Z"): number | null => {
    const match = value.match(new RegExp(`${axis}:([-\\d.]+)`));
    if (!match) {
      return null;
    }

    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    x: readAxis("X"),
    y: readAxis("Y"),
    z: readAxis("Z"),
  };
}

export function formatAxisPosition(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "\u2014";
  }

  return `${value.toFixed(0)} mm`;
}

/** Creality reports homing flags in `autohome`, e.g. `"X:1 Y:1 Z:0"` (1 = homed). */
export function parseAutohomeStatus(value: unknown): AxisHomedStatus {
  if (typeof value !== "string") {
    return { x: null, y: null, z: null };
  }

  const readAxis = (axis: "X" | "Y" | "Z"): boolean | null => {
    const match = value.match(new RegExp(`${axis}:(\\d+)`));
    if (!match) {
      return null;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (parsed === 1) {
      return true;
    }
    if (parsed === 0) {
      return false;
    }

    return null;
  };

  return {
    x: readAxis("X"),
    y: readAxis("Y"),
    z: readAxis("Z"),
  };
}

export function canJogXY(homed: AxisHomedStatus): boolean {
  return homed.x === true && homed.y === true;
}

export function canJogZ(homed: AxisHomedStatus): boolean {
  return homed.z === true;
}

const MIN_JOG_DISTANCE_MM = 0.01;
const JOG_DISTANCE_PRECISION = 100;

function roundJogDistanceDown(mm: number): number {
  return Math.floor(mm * JOG_DISTANCE_PRECISION) / JOG_DISTANCE_PRECISION;
}

export function clampJogDistance(
  position: AxisPosition,
  buildVolume: BuildVolume,
  axis: JogAxis,
  direction: JogDirection,
  stepMm: number,
): number | null {
  const current = position[axis];

  if (current === null) {
    return null;
  }

  const remaining =
    direction === 1 ? buildVolume[axis] - current : current;
  const clamped = roundJogDistanceDown(Math.min(stepMm, remaining));

  if (clamped < MIN_JOG_DISTANCE_MM) {
    return null;
  }

  return clamped;
}

export function canJogWithinBuildVolume(
  position: AxisPosition,
  buildVolume: BuildVolume,
  axis: JogAxis,
  direction: JogDirection,
  stepMm: number,
): boolean {
  return clampJogDistance(position, buildVolume, axis, direction, stepMm) !== null;
}
