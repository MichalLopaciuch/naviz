import type { AlgorithmFn } from '../types';
import { MinHeap } from '../utils/minHeap';
import { getDirections } from './utils';

const manhattan = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

const euclidean = (a: [number, number], b: [number, number]) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

export const astar: AlgorithmFn = (cells, start, end, { heuristic, allowDiagonals }) => {
  const t0 = performance.now();
  const rows = cells.length;
  const cols = cells[0].length;
  const h = heuristic === 'manhattan' ? manhattan : euclidean;

  const key = (r: number, c: number) => `${r},${c}`;
  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, [number, number] | null>();
  const exploredOrder: [number, number][] = [];
  const frontierAtStep: [number, number][][] = [];

  const startKey = key(start[0], start[1]);
  gScore.set(startKey, 0);
  const open = new MinHeap<[number, number]>();
  open.push(start, h(start, end));
  const openSet = new Set<string>([startKey]);
  const closedSet = new Set<string>();

  const dirs = getDirections(allowDiagonals);

  while (open.size > 0) {
    const current = open.pop()!;
    const ck = key(current[0], current[1]);
    if (closedSet.has(ck)) continue;
    closedSet.add(ck);
    openSet.delete(ck);
    exploredOrder.push(current);

    const frontier: [number, number][] = [];
    for (const [dr, dc] of dirs) {
      const nr = current[0] + dr;
      const nc = current[1] + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nk = key(nr, nc);
      if (openSet.has(nk)) frontier.push([nr, nc]);
    }
    frontierAtStep.push(frontier);

    if (current[0] === end[0] && current[1] === end[1]) {
      const path: [number, number][] = [];
      let cur: [number, number] | null | undefined = end;
      while (cur) {
        path.unshift(cur);
        cur = cameFrom.get(key(cur[0], cur[1]));
      }
      return {
        exploredOrder,
        frontierAtStep,
        path,
        stats: { cellsExplored: exploredOrder.length, pathLength: path.length, computeTimeMs: performance.now() - t0 },
      };
    }

    for (const [dr, dc] of dirs) {
      const nr = current[0] + dr;
      const nc = current[1] + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const neighbor = cells[nr][nc];
      if (neighbor.type === 'wall') continue;
      const nk = key(nr, nc);
      if (closedSet.has(nk)) continue;
      const moveCost = Math.abs(dr) + Math.abs(dc) === 2 ? Math.SQRT2 : 1;
      const tentativeG = (gScore.get(ck) ?? Infinity) + moveCost * neighbor.weight;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentativeG);
        cameFrom.set(nk, current);
        const f = tentativeG + h([nr, nc], end);
        open.push([nr, nc], f);
        openSet.add(nk);
      }
    }
  }

  return {
    exploredOrder,
    frontierAtStep,
    path: null,
    stats: { cellsExplored: exploredOrder.length, pathLength: null, computeTimeMs: performance.now() - t0 },
  };
};
