import type { TerrainType } from './types';

/** Base pixel size of each grid cell (no zoom transforms — always 1:1). */
export const BASE_CELL_PX = 5;

/** Hard caps to keep algorithm performance reasonable on very large viewports. */
export const MAX_GRID_ROWS = 200;
export const MAX_GRID_COLS = 320;

export const TERRAIN_COSTS: Record<TerrainType, number> = {
  plains: 1,
  forest: 5,
  mountain: 10,
};

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  plains: '#0f172a',
  forest: '#166534',
  mountain: '#44403c',
};

export const COLORS = {
  empty: '#0f172a',
  wall: '#64748b',
  start: '#22c55e',
  end: '#ef4444',
  explored: '#3b82f6',
  frontier: '#f97316',
  path: '#fbbf24',
  grid: '#1e293b',
};
