import { useRef, useEffect, useCallback } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import { CELL_SIZE, COLORS, TERRAIN_COLORS } from '../constants';
import type { Cell } from '../types';

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cells: Cell[][],
  exploredSet: Set<string>,
  frontierSet: Set<string>,
  pathSet: Set<string>
) {
  const rows = cells.length;
  const cols = cells[0].length;

  ctx.clearRect(0, 0, cols * CELL_SIZE, rows * CELL_SIZE);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const key = `${r},${c}`;
      let color: string;

      if (cell.type === 'wall') {
        color = COLORS.wall;
      } else if (cell.type === 'start') {
        color = COLORS.start;
      } else if (cell.type === 'end') {
        color = COLORS.end;
      } else if (pathSet.has(key)) {
        color = COLORS.path;
      } else if (frontierSet.has(key)) {
        color = COLORS.frontier;
      } else if (exploredSet.has(key)) {
        color = COLORS.explored;
      } else {
        color = TERRAIN_COLORS[cell.terrain];
      }

      ctx.fillStyle = color;
      ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

interface DragState {
  active: boolean;
  startRow: number;
  startCol: number;
  previewCells: Set<string>;
}

export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<DragState>({ active: false, startRow: 0, startCol: 0, previewCells: new Set() });

  const cells = useGridStore((s) => s.cells);
  const interactionMode = useGridStore((s) => s.interactionMode);
  const selectedTerrain = useGridStore((s) => s.selectedTerrain);
  const setCell = useGridStore((s) => s.setCell);
  const setStartCell = useGridStore((s) => s.setStartCell);
  const setEndCell = useGridStore((s) => s.setEndCell);

  const result = useAlgorithmStore((s) => s.result);
  const currentStep = useAlgorithmStore((s) => s.currentStep);

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const exploredSet = new Set<string>();
    const frontierSet = new Set<string>();
    const pathSet = new Set<string>();

    if (result) {
      const exploredSlice = result.exploredOrder.slice(0, currentStep);
      for (const [r, c] of exploredSlice) exploredSet.add(`${r},${c}`);

      const lastFrontier = result.frontierAtStep[currentStep - 1] ?? [];
      for (const [r, c] of lastFrontier) frontierSet.add(`${r},${c}`);

      if (currentStep >= result.exploredOrder.length && result.path) {
        for (const [r, c] of result.path) pathSet.add(`${r},${c}`);
      }
    }

    drawGrid(ctx, cells, exploredSet, frontierSet, pathSet);
  }, [cells, result, currentStep, rows, cols]);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / CELL_SIZE);
      const row = Math.floor(y / CELL_SIZE);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
      return [row, col];
    },
    [rows, cols]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCellFromEvent(e);
      if (!pos) return;
      const [row, col] = pos;

      if (interactionMode === 'start') {
        setStartCell(row, col);
        return;
      }
      if (interactionMode === 'end') {
        setEndCell(row, col);
        return;
      }

      dragState.current = { active: true, startRow: row, startCol: col, previewCells: new Set() };

      if (interactionMode === 'wall') {
        setCell(row, col, 'wall');
      } else if (interactionMode === 'erase') {
        setCell(row, col, 'empty');
      } else if (interactionMode === 'terrain') {
        setCell(row, col, 'empty', selectedTerrain);
      }
    },
    [interactionMode, selectedTerrain, getCellFromEvent, setCell, setStartCell, setEndCell]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState.current.active) return;
      const pos = getCellFromEvent(e);
      if (!pos) return;
      const [row, col] = pos;

      if (interactionMode === 'wall' || interactionMode === 'erase' || interactionMode === 'terrain') {
        const type = interactionMode === 'wall' ? 'wall' : 'empty';
        const terrain = interactionMode === 'terrain' ? selectedTerrain : undefined;
        setCell(row, col, type, terrain);
      }
    },
    [interactionMode, selectedTerrain, getCellFromEvent, setCell]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current.active = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={cols * CELL_SIZE}
      height={rows * CELL_SIZE}
      className="cursor-crosshair border border-slate-700"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
