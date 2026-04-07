import type { AlgorithmFn, AlgorithmResult, AlgorithmType, Cell } from '../types';
import init, {
  run_astar,
  run_bfs,
  run_dfs,
  run_dijkstra,
} from '../wasm-pkg/naviz.js';

export function isWasmSupported(): boolean {
  return typeof WebAssembly !== 'undefined';
}

let _initPromise: Promise<void> | null = null;

/** Call once before using any WASM algorithm function. Safe to call multiple times. */
export function initWasm(): Promise<void> {
  if (!_initPromise) {
    _initPromise = init().then(() => undefined);
  }
  return _initPromise;
}

/** Flat Float64Array representation: 0.0 = wall, positive = terrain cost. */
function cellsToWeights(cells: Cell[][]): Float64Array {
  const rows = cells.length;
  const cols = cells[0].length;
  const weights = new Float64Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      weights[r * cols + c] = cell.type === 'wall' ? 0.0 : cell.weight;
    }
  }
  return weights;
}

const wasmBfs: AlgorithmFn = (cells, start, end, { allowDiagonals }) => {
  const weights = cellsToWeights(cells);
  return run_bfs(
    weights,
    cells.length,
    cells[0].length,
    start[0],
    start[1],
    end[0],
    end[1],
    allowDiagonals,
  ) as AlgorithmResult;
};

const wasmDfs: AlgorithmFn = (cells, start, end, { allowDiagonals }) => {
  const weights = cellsToWeights(cells);
  return run_dfs(
    weights,
    cells.length,
    cells[0].length,
    start[0],
    start[1],
    end[0],
    end[1],
    allowDiagonals,
  ) as AlgorithmResult;
};

const wasmDijkstra: AlgorithmFn = (cells, start, end, { allowDiagonals }) => {
  const weights = cellsToWeights(cells);
  return run_dijkstra(
    weights,
    cells.length,
    cells[0].length,
    start[0],
    start[1],
    end[0],
    end[1],
    allowDiagonals,
  ) as AlgorithmResult;
};

const wasmAstar: AlgorithmFn = (cells, start, end, { heuristic, allowDiagonals }) => {
  const weights = cellsToWeights(cells);
  return run_astar(
    weights,
    cells.length,
    cells[0].length,
    start[0],
    start[1],
    end[0],
    end[1],
    allowDiagonals,
    heuristic === 'manhattan' ? 0 : 1,
  ) as AlgorithmResult;
};

export const WASM_ALGORITHMS: Record<AlgorithmType, AlgorithmFn> = {
  bfs: wasmBfs,
  dfs: wasmDfs,
  dijkstra: wasmDijkstra,
  astar: wasmAstar,
};
