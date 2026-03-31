export type CellType = 'empty' | 'wall' | 'start' | 'end';
export type TerrainType = 'plains' | 'forest' | 'swamp' | 'mountain';
export type InteractionMode = 'wall' | 'start' | 'end' | 'erase';
export type HeuristicType = 'manhattan' | 'euclidean';
export type AlgorithmType = 'astar' | 'dijkstra' | 'bfs' | 'dfs';

export interface Cell {
  row: number;
  col: number;
  type: CellType;
  terrain: TerrainType;
  weight: number;
}

export interface AlgorithmStats {
  cellsExplored: number;
  pathLength: number | null;
  computeTimeMs: number;
}

export interface AlgorithmResult {
  exploredOrder: [number, number][];
  frontierAtStep: [number, number][][];
  path: [number, number][] | null;
  stats: AlgorithmStats;
}

/** Contract every algorithm must satisfy. Adding new algorithms is as simple as
 *  implementing this function and registering it in algorithms/index.ts. */
export type AlgorithmFn = (
  cells: Cell[][],
  start: [number, number],
  end: [number, number],
  options: { heuristic: HeuristicType; allowDiagonals: boolean }
) => AlgorithmResult;
