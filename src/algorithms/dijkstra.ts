import type { AlgorithmFn } from '../types';
import { MinHeap } from '../utils/minHeap';

export const dijkstra: AlgorithmFn = (cells, start, end, { allowDiagonals }) => {
  const t0 = performance.now();
  const rows = cells.length;
  const cols = cells[0].length;
  const key = (r: number, c: number) => `${r},${c}`;
  const dist = new Map<string, number>();
  const cameFrom = new Map<string, [number, number] | null>();
  const exploredOrder: [number, number][] = [];
  const frontierAtStep: [number, number][][] = [];

  const startKey = key(start[0], start[1]);
  dist.set(startKey, 0);
  const open = new MinHeap<[number, number]>();
  open.push(start, 0);
  const openSet = new Set<string>([startKey]);
  const closedSet = new Set<string>();

  const dirs = allowDiagonals
    ? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
    : [[-1,0],[1,0],[0,-1],[0,1]];

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
      const tentativeDist = (dist.get(ck) ?? Infinity) + moveCost * neighbor.weight;
      if (tentativeDist < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, tentativeDist);
        cameFrom.set(nk, current);
        open.push([nr, nc], tentativeDist);
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
