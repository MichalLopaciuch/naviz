import { create } from 'zustand';
import type { Cell, CellType, InteractionMode, TerrainType } from '../types';
import { GRID_ROWS, GRID_COLS, TERRAIN_COSTS } from '../constants';

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

interface GridState {
  rows: number;
  cols: number;
  cells: Cell[][];
  startCell: [number, number] | null;
  endCell: [number, number] | null;
  interactionMode: InteractionMode;
  selectedTerrain: TerrainType;
  selectedCustomColor: string;
  setCell: (row: number, col: number, type: CellType, terrain?: TerrainType, customColor?: string) => void;
  setCellRect: (r1: number, c1: number, r2: number, c2: number, type: CellType, terrain?: TerrainType) => void;
  setStartCell: (row: number, col: number) => void;
  setEndCell: (row: number, col: number) => void;
  clearGrid: () => void;
  clearWalls: () => void;
  resizeGrid: (newRows: number, newCols: number) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setSelectedTerrain: (terrain: TerrainType) => void;
  setSelectedCustomColor: (color: string) => void;
}

export const useGridStore = create<GridState>((set) => ({
  rows: GRID_ROWS,
  cols: GRID_COLS,
  cells: makeGrid(GRID_ROWS, GRID_COLS),
  startCell: null,
  endCell: null,
  interactionMode: 'wall',
  selectedTerrain: 'forest',
  selectedCustomColor: '#6366f1',

  setCell: (row, col, type, terrain, customColor) =>
    set((state) => {
      const cells = state.cells.map((r) => [...r]);
      const t = terrain ?? cells[row][col].terrain;
      const weight = type === 'wall' ? Infinity : TERRAIN_COSTS[t];
      cells[row] = [...cells[row]];
      cells[row][col] = { ...cells[row][col], type, terrain: t, weight, customColor };
      return { cells };
    }),

  setCellRect: (r1, c1, r2, c2, type, terrain) =>
    set((state) => {
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      const minC = Math.min(c1, c2);
      const maxC = Math.max(c1, c2);
      const cells = state.cells.map((r) => [...r]);
      for (let r = minR; r <= maxR; r++) {
        cells[r] = [...cells[r]];
        for (let c = minC; c <= maxC; c++) {
          const t = terrain ?? cells[r][c].terrain;
          const weight = type === 'wall' ? Infinity : TERRAIN_COSTS[t];
          cells[r][c] = { ...cells[r][c], type, terrain: t, weight };
        }
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
  setSelectedTerrain: (terrain) => set({ selectedTerrain: terrain }),
  setSelectedCustomColor: (color) => set({ selectedCustomColor: color }),
}));
