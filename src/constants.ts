import type { TerrainType } from './types';

/** Base pixel size of each grid cell (no zoom transforms — always 1:1). */
export const BASE_CELL_PX = 5;

/** Hard caps to keep algorithm performance reasonable on very large viewports. */
export const MAX_GRID_ROWS = 200;
export const MAX_GRID_COLS = 320;

export const TERRAIN_COSTS: Record<TerrainType, number> = {
  plains: 1,
  forest: 3,
  swamp: 5,
  mountain: 10,
};

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  plains: '#1e293b',
  forest: '#14532d',
  swamp: '#3b2a1a',
  mountain: '#374151',
};

export const COLORS = {
  empty: '#1e293b',
  wall: '#334155',
  start: '#22c55e',
  end: '#ef4444',
  explored: '#bfdbfe',
  frontier: '#fb923c',
  path: '#fde047',
  grid: '#0f172a',
};
