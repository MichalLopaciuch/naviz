import { astar } from './astar';
import { dijkstra } from './dijkstra';
import { bfs } from './bfs';
import { dfs } from './dfs';
import type { AlgorithmFn, AlgorithmType } from '../types';

export const ALGORITHMS: Record<AlgorithmType, AlgorithmFn> = {
  astar,
  dijkstra,
  bfs,
  dfs,
};

export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  astar: 'A*',
  dijkstra: 'Dijkstra',
  bfs: 'BFS',
  dfs: 'DFS',
};
