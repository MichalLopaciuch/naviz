import { useRef, useEffect, useCallback, useState } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import { COLORS, TERRAIN_COLORS, BASE_CELL_PX, MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { bresenhamLine } from '../utils/bresenham';
import type { Cell } from '../types';
import type { CellBatchUpdate } from '../store/gridStore';

/** Fixed brush radius in cells. */
const BRUSH_SIZE = 5;

/** Milliseconds to wait after the last container resize before updating the grid. */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Returns all cell updates for a circular brush centred on (centerRow, centerCol).
 * Start/end are always single-cell pins and are handled separately.
 */
function getBrushUpdates(
  centerRow: number,
  centerCol: number,
  rows: number,
  cols: number,
  erase: boolean
): CellBatchUpdate[] {
  const updates: CellBatchUpdate[] = [];
  const type = erase ? 'empty' : 'wall';
  const radius = Math.ceil(BRUSH_SIZE);
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (Math.sqrt(dr * dr + dc * dc) > BRUSH_SIZE - 0.5) continue;
      const nr = centerRow + dr;
      const nc = centerCol + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      updates.push({ row: nr, col: nc, type });
    }
  }
  return updates;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cells: Cell[][],
  exploredSet: Set<string>,
  frontierSet: Set<string>,
  pathSet: Set<string>,
  showGrid: boolean
) {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

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
      ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);

      if (showGrid) {
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      }
    }
  }
}

export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the previous cell during a drag so Bresenham can fill gaps.
  const prevCell = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);

  // Debounce timer for grid resize on container changes.
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Container size tracked in state so layout changes trigger a re-render and
  // resize the canvas accordingly.
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const cells = useGridStore((s) => s.cells);
  const interactionMode = useGridStore((s) => s.interactionMode);
  const showGrid = useGridStore((s) => s.showGrid);
  const setStartCell = useGridStore((s) => s.setStartCell);
  const setEndCell = useGridStore((s) => s.setEndCell);
  const setCellBatch = useGridStore((s) => s.setCellBatch);
  const resizeGrid = useGridStore((s) => s.resizeGrid);

  const result = useAlgorithmStore((s) => s.result);
  const currentStep = useAlgorithmStore((s) => s.currentStep);

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  // Measure container and update canvas intrinsic size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-resize the backing grid when the container size changes.
  // Debounced so rapid window-resize events don't thrash the store.
  // Note: does NOT reset the algorithm result — the current result stays
  // visible until the user explicitly re-runs or clears.
  useEffect(() => {
    const { w, h } = containerSize;
    if (w === 0 || h === 0) return;

    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      const newRows = Math.min(MAX_GRID_ROWS, Math.max(1, Math.floor(h / BASE_CELL_PX)));
      const newCols = Math.min(MAX_GRID_COLS, Math.max(1, Math.floor(w / BASE_CELL_PX)));
      const { rows: curRows, cols: curCols } = useGridStore.getState();
      if (newRows !== curRows || newCols !== curCols) {
        resizeGrid(newRows, newCols);
      }
    }, RESIZE_DEBOUNCE_MS);

    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [containerSize, resizeGrid]);

  // Build the sets needed for algorithm overlay and redraw.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerSize.w === 0) return;
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, cells, exploredSet, frontierSet, pathSet, showGrid);
  }, [cells, result, currentStep, showGrid, containerSize]);

  // Redraw whenever data or size changes.
  useEffect(() => {
    redraw();
  }, [redraw]);

  /** Convert a canvas-relative mouse position to grid [row, col]. */
  const canvasToCell = useCallback(
    (mouseX: number, mouseY: number): [number, number] | null => {
      const col = Math.floor(mouseX / BASE_CELL_PX);
      const row = Math.floor(mouseY / BASE_CELL_PX);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
      return [row, col];
    },
    [rows, cols]
  );

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;

      const { x, y } = getMousePos(e) ?? {};
      if (x === undefined || y === undefined) return;
      const pos = canvasToCell(x, y);
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

      isDragging.current = true;
      prevCell.current = [row, col];

      const updates = getBrushUpdates(row, col, rows, cols, interactionMode === 'erase');
      if (updates.length > 0) setCellBatch(updates);
    },
    [canvasToCell, interactionMode, rows, cols, setCellBatch, setStartCell, setEndCell]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;

      const mousePos = getMousePos(e);
      if (!mousePos) return;
      const { x, y } = mousePos;
      const pos = canvasToCell(x, y);
      if (!pos) return;
      const [row, col] = pos;

      if (!prevCell.current) {
        prevCell.current = [row, col];
        return;
      }

      // Collect all unique cell updates across every Bresenham point in one
      // store call to minimise Zustand state transitions per mouse event.
      const [pr, pc] = prevCell.current;
      const line = bresenhamLine(pr, pc, row, col);
      const erase = interactionMode === 'erase';

      const updateMap = new Map<string, CellBatchUpdate>();
      for (let i = 1; i < line.length; i++) {
        const [lr, lc] = line[i];
        for (const u of getBrushUpdates(lr, lc, rows, cols, erase)) {
          const key = `${u.row},${u.col}`;
          if (!updateMap.has(key)) updateMap.set(key, u);
        }
      }

      if (updateMap.size > 0) setCellBatch(Array.from(updateMap.values()));
      prevCell.current = [row, col];
    },
    [canvasToCell, interactionMode, rows, cols, setCellBatch]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    prevCell.current = null;
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={containerSize.w}
          height={containerSize.h}
          className="block cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Grid resolution readout */}
        <div className="absolute bottom-2 right-2 text-xs text-slate-600 bg-slate-900/80 px-2 py-0.5 rounded pointer-events-none select-none">
          {rows}×{cols}
        </div>
      </div>
    </div>
  );
}
