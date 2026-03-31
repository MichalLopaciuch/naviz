import { create } from 'zustand';
import type { Cell, CellType, InteractionMode, TerrainType } from '../types';
import { TERRAIN_COSTS } from '../constants';

/** Initial grid dimensions used before the first container measurement. */
const INIT_ROWS = 40;
const INIT_COLS = 60;

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

/** Minimal unit used by setCellBatch for efficient bulk updates. */
export interface CellBatchUpdate {
  row: number;
  col: number;
  type: CellType;
  /** Overrides terrain-derived weight when provided (reserved for future use). */
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
  showGrid: boolean;
  setCell: (row: number, col: number, type: CellType) => void;
  setCellBatch: (updates: CellBatchUpdate[]) => void;
  setStartCell: (row: number, col: number) => void;
  setEndCell: (row: number, col: number) => void;
  clearGrid: () => void;
  clearWalls: () => void;
  resizeGrid: (newRows: number, newCols: number) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setShowGrid: (v: boolean) => void;
}

export const useGridStore = create<GridState>((set) => ({
  rows: INIT_ROWS,
  cols: INIT_COLS,
  cells: makeGrid(INIT_ROWS, INIT_COLS),
  startCell: null,
  endCell: null,
  interactionMode: 'wall',
  showGrid: false,

  setCell: (row, col, type) =>
    set((state) => {
      const cells = state.cells.map((r) => [...r]);
      const t = cells[row][col].terrain;
      const weight = type === 'wall' ? Infinity : TERRAIN_COSTS[t];
      cells[row] = [...cells[row]];
      cells[row][col] = { ...cells[row][col], type, weight };
      return { cells };
    }),

  setCellBatch: (updates) =>
    set((state) => {
      if (updates.length === 0) return {};
      // Only clone rows that will actually be modified.
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

  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setShowGrid: (v) => set({ showGrid: v }),
}));
