import { useRef, useEffect, useCallback, useState } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import { COLORS, TERRAIN_COLORS, BASE_CELL_PX, MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { bresenhamLine } from '../utils/bresenham';
import type { Cell } from '../types';
import type { CellBatchUpdate } from '../store/gridStore';
import type { InteractionMode, TerrainType } from '../types';

/** Fixed brush radius in cells for wall/erase/terrain painting. */
const BRUSH_SIZE = 5;

/** Radius (in canvas px) for the start/end pin circles. */
const PIN_RADIUS = BASE_CELL_PX * 1.8;

/** Milliseconds to wait after the last container resize before updating the grid. */
const RESIZE_DEBOUNCE_MS = 150;

function getBrushUpdates(
  centerRow: number,
  centerCol: number,
  rows: number,
  cols: number,
  mode: 'wall' | 'erase' | 'terrain',
  selectedTerrain: TerrainType
): CellBatchUpdate[] {
  const updates: CellBatchUpdate[] = [];
  const radius = Math.ceil(BRUSH_SIZE);
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (Math.sqrt(dr * dr + dc * dc) > BRUSH_SIZE - 0.5) continue;
      const nr = centerRow + dr;
      const nc = centerCol + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (mode === 'wall') {
        updates.push({ row: nr, col: nc, type: 'wall' });
      } else if (mode === 'erase') {
        updates.push({ row: nr, col: nc, type: 'empty', terrain: 'plains' });
      } else {
        updates.push({ row: nr, col: nc, type: 'empty', terrain: selectedTerrain });
      }
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
  const pins: { cx: number; cy: number; color: string }[] = [];

  // Hoist stable style assignments outside the inner loop.
  if (showGrid) {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const key = `${r},${c}`;

      if (cell.type === 'start') {
        pins.push({ cx: (c + 0.5) * BASE_CELL_PX, cy: (r + 0.5) * BASE_CELL_PX, color: COLORS.start });
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      } else if (cell.type === 'end') {
        pins.push({ cx: (c + 0.5) * BASE_CELL_PX, cy: (r + 0.5) * BASE_CELL_PX, color: COLORS.end });
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      } else if (cell.type === 'wall') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      } else if (pathSet.has(key)) {
        ctx.fillStyle = COLORS.path;
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      } else if (frontierSet.has(key)) {
        // Draw terrain beneath, then semi-transparent frontier overlay.
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = COLORS.frontier;
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
        ctx.globalAlpha = 1;
      } else if (exploredSet.has(key)) {
        // Draw terrain beneath, then semi-transparent explored overlay.
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = COLORS.explored;
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
        ctx.fillRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      }

      if (showGrid) {
        ctx.strokeRect(c * BASE_CELL_PX, r * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
      }
    }
  }

  // Draw start/end pins as circles on top of everything else.
  for (const { cx, cy, color } of pins) {
    ctx.beginPath();
    ctx.arc(cx, cy, PIN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const prevCell = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const cells = useGridStore((s) => s.cells);
  const interactionMode = useGridStore((s) => s.interactionMode);
  const selectedTerrain = useGridStore((s) => s.selectedTerrain);
  const showGrid = useGridStore((s) => s.showGrid);
  const setStartCell = useGridStore((s) => s.setStartCell);
  const setEndCell = useGridStore((s) => s.setEndCell);
  const setCellBatch = useGridStore((s) => s.setCellBatch);
  const resizeGrid = useGridStore((s) => s.resizeGrid);

  const result = useAlgorithmStore((s) => s.result);
  const currentStep = useAlgorithmStore((s) => s.currentStep);

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  // Observe container size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resize (or initialize) the grid when container size changes.
  useEffect(() => {
    const { w, h } = containerSize;
    if (w === 0 || h === 0) return;

    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      const newRows = Math.min(MAX_GRID_ROWS, Math.max(1, Math.floor(h / BASE_CELL_PX)));
      const newCols = Math.min(MAX_GRID_COLS, Math.max(1, Math.floor(w / BASE_CELL_PX)));

      if (newRows !== rows || newCols !== cols) {
        resizeGrid(newRows, newCols);
      }
    }, RESIZE_DEBOUNCE_MS);

    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [containerSize, resizeGrid]);

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

  useEffect(() => {
    redraw();
  }, [redraw]);

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

  const isBrushMode = (mode: InteractionMode): mode is 'wall' | 'erase' | 'terrain' =>
    mode === 'wall' || mode === 'erase' || mode === 'terrain';

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const pos = getMousePos(e);
      if (!pos) return;
      const cell = canvasToCell(pos.x, pos.y);
      if (!cell) return;
      const [row, col] = cell;

      if (interactionMode === 'start') { setStartCell(row, col); return; }
      if (interactionMode === 'end') { setEndCell(row, col); return; }
      if (!isBrushMode(interactionMode)) return;

      isDragging.current = true;
      prevCell.current = [row, col];
      const updates = getBrushUpdates(row, col, rows, cols, interactionMode, selectedTerrain);
      if (updates.length > 0) setCellBatch(updates);
    },
    [canvasToCell, interactionMode, rows, cols, selectedTerrain, setCellBatch, setStartCell, setEndCell]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      const mousePos = getMousePos(e);
      if (!mousePos) return;
      const cell = canvasToCell(mousePos.x, mousePos.y);
      if (!cell) return;
      const [row, col] = cell;

      if (!prevCell.current) { prevCell.current = [row, col]; return; }
      if (!isBrushMode(interactionMode)) return;

      const [pr, pc] = prevCell.current;
      const line = bresenhamLine(pr, pc, row, col);
      const updateMap = new Map<string, CellBatchUpdate>();
      for (let i = 1; i < line.length; i++) {
        const [lr, lc] = line[i];
        for (const u of getBrushUpdates(lr, lc, rows, cols, interactionMode, selectedTerrain)) {
          const key = `${u.row},${u.col}`;
          if (!updateMap.has(key)) updateMap.set(key, u);
        }
      }
      if (updateMap.size > 0) setCellBatch(Array.from(updateMap.values()));
      prevCell.current = [row, col];
    },
    [canvasToCell, interactionMode, rows, cols, selectedTerrain, setCellBatch]
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
        <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded pointer-events-none select-none">
          {rows}×{cols}
        </div>
      </div>
    </div>
  );
}
