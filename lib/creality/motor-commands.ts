export type JogAxis = "x" | "y" | "z";
export type JogDirection = 1 | -1;
export type HomeAxes = "xy" | "z";

const JOG_FEEDRATE_MM_MIN = 3000;

function formatGcodeDistance(mm: number): string {
  const rounded = Number(mm.toFixed(2));
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

export function buildJogGcode(
  axis: JogAxis,
  stepMm: number,
  direction: JogDirection,
): string {
  const distance = stepMm * direction;
  const axisLetter = axis.toUpperCase();

  // Creality's gcodeCmd handler only accepts one command per line. A single
  // "G91 G1 … G90" string is acknowledged but never moves the toolhead.
  return [
    "G91",
    `G1 ${axisLetter}${formatGcodeDistance(distance)} F${JOG_FEEDRATE_MM_MIN}`,
    "G90",
  ].join("\n");
}

export function buildJogParams(
  axis: JogAxis,
  stepMm: number,
  direction: JogDirection,
): Record<string, string> {
  return {
    gcodeCmd: buildJogGcode(axis, stepMm, direction),
  };
}

export function buildHomeParams(axes: HomeAxes): Record<string, string> {
  return {
    autohome: axes === "xy" ? "X Y" : "Z",
  };
}

/** Creality reports `deviceState: 0` when manual moves/homing are allowed. */
export function canMotorControl(telemetry: { deviceState?: number }): boolean {
  return telemetry.deviceState === 0;
}

export function isHoming(telemetry: { deviceState?: number }): boolean {
  return telemetry.deviceState === 7;
}
