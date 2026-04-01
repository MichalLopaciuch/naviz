import { create } from 'zustand';
import type { Cell, CellType, InteractionMode, TerrainType } from '../types';
import { TERRAIN_COSTS } from '../constants';

const makeCell = (row: number, col: number): Cell => ({
  row,
  col,
  type: 'empty',
  terrain: 'plains',
  weight: TERRAIN_COSTS.plains,
});

const makeGrid = (rows: number, cols: number): Cell[][] =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => makeCell(r, c))
  );

function buildDefaultLayout(
  rows: number,
  cols: number
): { cells: Cell[][]; startCell: [number, number]; endCell: [number, number] } {
  const cells = makeGrid(rows, cols);

  const R = (f: number) => Math.max(0, Math.min(rows - 1, Math.round(f * (rows - 1))));
  const C = (f: number) => Math.max(0, Math.min(cols - 1, Math.round(f * (cols - 1))));

  // Start and end pins
  const startR = R(0.15);
  const startC = C(0.12);
  const endR = R(0.82);
  const endC = C(0.88);
  cells[startR][startC] = { ...cells[startR][startC], type: 'start' };
  cells[endR][endC] = { ...cells[endR][endC], type: 'end' };

  // Horizontal wall at ~35% height, cols 25%–75%, gap at 48–52%
  const wallRow = R(0.35);
  for (let col = C(0.25); col <= C(0.75); col++) {
    if (col >= C(0.48) && col <= C(0.52)) continue;
    cells[wallRow][col] = { ...cells[wallRow][col], type: 'wall', weight: Infinity };
  }

  // Vertical wall at ~62% col, rows 50%–80%, gap at 63–67%
  const wallCol = C(0.62);
  for (let row = R(0.50); row <= R(0.80); row++) {
    if (row >= R(0.63) && row <= R(0.67)) continue;
    cells[row][wallCol] = { ...cells[row][wallCol], type: 'wall', weight: Infinity };
  }

  // Forest terrain: rows 45–70%, cols 25–55%
  for (let row = R(0.45); row <= R(0.70); row++) {
    for (let col = C(0.25); col <= C(0.55); col++) {
      if (cells[row][col].type === 'empty') {
        cells[row][col] = { ...cells[row][col], terrain: 'forest', weight: TERRAIN_COSTS.forest };
      }
    }
  }

  // Mountain terrain: rows 15–38%, cols 55–78%
  for (let row = R(0.15); row <= R(0.38); row++) {
    for (let col = C(0.55); col <= C(0.78); col++) {
      if (cells[row][col].type === 'empty') {
        cells[row][col] = { ...cells[row][col], terrain: 'mountain', weight: TERRAIN_COSTS.mountain };
      }
    }
  }

  return { cells, startCell: [startR, startC], endCell: [endR, endC] };
}

/** Minimal unit used by setCellBatch for efficient bulk updates. */
export interface CellBatchUpdate {
  row: number;
  col: number;
  type: CellType;
  terrain?: TerrainType;
  weight?: number;
}

interface GridState {
  rows: number;
  cols: number;
  cells: Cell[][];
  startCell: [number, number] | null;
  endCell: [number, number] | null;
  interactionMode: InteractionMode;
  selectedTerrain: TerrainType;
  showGrid: boolean;
  setCellBatch: (updates: CellBatchUpdate[]) => void;
  setStartCell: (row: number, col: number) => void;
  setEndCell: (row: number, col: number) => void;
  clearGrid: () => void;
  clearWalls: () => void;
  resizeGrid: (newRows: number, newCols: number) => void;
  initDefaultLayout: (newRows: number, newCols: number) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setSelectedTerrain: (terrain: TerrainType) => void;
  setShowGrid: (v: boolean) => void;
}

export const useGridStore = create<GridState>((set) => ({
  rows: 40,
  cols: 60,
  cells: makeGrid(40, 60),
  startCell: null,
  endCell: null,
  interactionMode: 'wall',
  selectedTerrain: 'forest',
  showGrid: false,

  setCellBatch: (updates) =>
    set((state) => {
      if (updates.length === 0) return {};
      const affectedRows = new Set(updates.map((u) => u.row));
      const cells = state.cells.map((r, i) => (affectedRows.has(i) ? [...r] : r));
      for (const { row, col, type, terrain, weight } of updates) {
        if (row < 0 || row >= cells.length || col < 0 || col >= cells[0]?.length) continue;
        const t = terrain ?? cells[row][col].terrain;
        const w = weight !== undefined ? weight : type === 'wall' ? Infinity : TERRAIN_COSTS[t];
        cells[row][col] = { ...cells[row][col], type, terrain: t, weight: w };
      }
      return { cells };
    }),

  setStartCell: (row, col) =>
    set((state) => {
      const cells = state.cells.map((r) => [...r]);
      if (state.startCell) {
        const [sr, sc] = state.startCell;
        cells[sr] = [...cells[sr]];
        cells[sr][sc] = { ...cells[sr][sc], type: 'empty' };
      }
      cells[row] = [...cells[row]];
      cells[row][col] = { ...cells[row][col], type: 'start' };
      return { cells, startCell: [row, col] };
    }),

  setEndCell: (row, col) =>
    set((state) => {
      const cells = state.cells.map((r) => [...r]);
      if (state.endCell) {
        const [er, ec] = state.endCell;
        cells[er] = [...cells[er]];
        cells[er][ec] = { ...cells[er][ec], type: 'empty' };
      }
      cells[row] = [...cells[row]];
      cells[row][col] = { ...cells[row][col], type: 'end' };
      return { cells, endCell: [row, col] };
    }),

  clearGrid: () =>
    set((state) => ({
      cells: makeGrid(state.rows, state.cols),
      startCell: null,
      endCell: null,
    })),

  clearWalls: () =>
    set((state) => {
      const cells = state.cells.map((row) =>
        row.map((cell) =>
          cell.type === 'wall'
            ? { ...cell, type: 'empty' as CellType, weight: TERRAIN_COSTS[cell.terrain] }
            : cell
        )
      );
      return { cells };
    }),

  resizeGrid: (newRows, newCols) =>
    set((state) => {
      const newCells = makeGrid(newRows, newCols);
      const copyRows = Math.min(newRows, state.rows);
      const copyCols = Math.min(newCols, state.cols);
      for (let r = 0; r < copyRows; r++) {
        for (let c = 0; c < copyCols; c++) {
          newCells[r][c] = { ...state.cells[r][c], row: r, col: c };
        }
      }
      const startCell =
        state.startCell && state.startCell[0] < newRows && state.startCell[1] < newCols
          ? state.startCell
          : null;
      const endCell =
        state.endCell && state.endCell[0] < newRows && state.endCell[1] < newCols
          ? state.endCell
          : null;
      return { rows: newRows, cols: newCols, cells: newCells, startCell, endCell };
    }),

  initDefaultLayout: (newRows, newCols) =>
    set(() => {
      const { cells, startCell, endCell } = buildDefaultLayout(newRows, newCols);
      return { rows: newRows, cols: newCols, cells, startCell, endCell };
    }),

  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setSelectedTerrain: (terrain) => set({ selectedTerrain: terrain }),
  setShowGrid: (v) => set({ showGrid: v }),
}));
