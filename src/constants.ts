import type { TerrainType } from './types';

export const GRID_ROWS = 40;
export const GRID_COLS = 60;

/** Base pixel size of each grid cell at zoom 1×. */
export const BASE_CELL_PX = 3;

/** Hard caps so extremely large viewports don't overwhelm the algorithms. */
export const MAX_GRID_ROWS = 400;
export const MAX_GRID_COLS = 600;

/** Brush size limits shared between the store and the ControlPanel slider. */
export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 20;

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
