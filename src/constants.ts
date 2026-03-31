import type { TerrainType } from './types';

export const GRID_ROWS = 40;
export const GRID_COLS = 60;

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
