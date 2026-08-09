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

  return `G91 G1 ${axisLetter}${formatGcodeDistance(distance)} F${JOG_FEEDRATE_MM_MIN} G90`;
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

export function isHoming(telemetry: { deviceState?: number }): boolean {
  return telemetry.deviceState === 7;
}
