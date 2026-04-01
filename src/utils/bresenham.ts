/**
 * Returns all grid cells on the line between (r0, c0) and (r1, c1)
 * using Bresenham's line algorithm. This ensures no cells are skipped
 * when the mouse moves quickly across the canvas.
 */
export function bresenhamLine(
  r0: number,
  c0: number,
  r1: number,
  c1: number
): [number, number][] {
  const points: [number, number][] = [];
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0;
  let c = c0;

  while (true) {
    points.push([r, c]);
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r += sr;
    }
    if (e2 < dr) {
      err += dr;
      c += sc;
    }
  }

  return points;
}
