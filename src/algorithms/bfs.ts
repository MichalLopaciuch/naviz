import type { AlgorithmFn } from '../types';

export const bfs: AlgorithmFn = (cells, start, end, { allowDiagonals }) => {
  const t0 = performance.now();
  const rows = cells.length;
  const cols = cells[0].length;
  const key = (r: number, c: number) => `${r},${c}`;
  const visited = new Set<string>();
  const cameFrom = new Map<string, [number, number] | null>();
  const exploredOrder: [number, number][] = [];
  const frontierAtStep: [number, number][][] = [];

  const queue: [number, number][] = [start];
  visited.add(key(start[0], start[1]));

  const dirs = allowDiagonals
    ? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
    : [[-1,0],[1,0],[0,-1],[0,1]];

  while (queue.length > 0) {
    const current = queue.shift()!;
    exploredOrder.push(current);

    const frontier: [number, number][] = [...queue];
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
      const nk = key(nr, nc);
      if (visited.has(nk)) continue;
      if (cells[nr][nc].type === 'wall') continue;
      visited.add(nk);
      cameFrom.set(nk, current);
      queue.push([nr, nc]);
    }
  }

  return {
    exploredOrder,
    frontierAtStep,
    path: null,
    stats: { cellsExplored: exploredOrder.length, pathLength: null, computeTimeMs: performance.now() - t0 },
  };
};
