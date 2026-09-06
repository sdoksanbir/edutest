/** Köşe ArUco-benzeri hizalama işaretleri — 4×4 yüksek kontrast matris. */

export type FiducialCorner = "tl" | "tr" | "bl" | "br";

type Cell = 0 | 1;

/** ArUco tarzı keskin siyah-beyaz desenler (4×4 veri hücresi + sınır). */
const PATTERNS: Record<FiducialCorner, Cell[][]> = {
  tl: [
    [1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1, 1],
    [1, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1],
  ],
  tr: [
    [1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
  ],
  bl: [
    [1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 1, 1],
    [1, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1],
  ],
  br: [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1],
  ],
};

export const FIDUCIAL_SIZE_PX = 32;

export function drawFiducialCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  corner: FiducialCorner,
) {
  const grid = PATTERNS[corner];
  const n = grid.length;
  const cell = size / n;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      ctx.fillStyle = grid[r]![c] ? "#000" : "#FFF";
      ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
    }
  }
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, size, size);
}

export function fiducialPatternCells(corner: FiducialCorner): Cell[][] {
  return PATTERNS[corner];
}

export function cornerFromMarkerId(id: string): FiducialCorner {
  if (id === "tr") return "tr";
  if (id === "bl") return "bl";
  if (id === "br") return "br";
  return "tl";
}
