import { useRef, useEffect, useCallback, useState } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import { COLORS, TERRAIN_COLORS, BASE_CELL_PX, MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { bresenhamLine } from '../utils/bresenham';
import type { Cell } from '../types';
import type { CellBatchUpdate } from '../store/gridStore';
import type { InteractionMode, TerrainType } from '../types';

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

/** Brush boundary offset: cells whose centre is within `brushSize - BRUSH_BOUNDARY_OFFSET`
 *  of the centre are included, giving smooth circular edges. */
const BRUSH_BOUNDARY_OFFSET = 0.5;

/** Delay (ms) between the last container resize event and the grid update. */
const RESIZE_DEBOUNCE_MS = 150;

/** Interpolates a colour between dark-blue (weight=1) and amber (weight=10). */
function weightToColor(w: number): string {
  const t = (w - 1) / 9;
  const r = Math.round(30 + t * (217 - 30));
  const g = Math.round(41 + t * (151 - 41));
  const b = Math.round(59 + t * (6 - 59));
  return `rgb(${r},${g},${b})`;
}

/**
 * Returns all cell updates produced by applying a circular brush centred on
 * (centerRow, centerCol).  Start/end are handled separately and not included.
 */
function getBrushUpdates(
  centerRow: number,
  centerCol: number,
  brushSize: number,
  rows: number,
  cols: number,
  mode: InteractionMode,
  selectedTerrain: TerrainType,
  selectedCustomColor: string
): CellBatchUpdate[] {
  const updates: CellBatchUpdate[] = [];
  const r = Math.ceil(brushSize);
  for (let dr = -r; dr <= r; dr++) {
    for (let dc = -r; dc <= r; dc++) {
      const dist = Math.sqrt(dr * dr + dc * dc);
      if (dist > brushSize - BRUSH_BOUNDARY_OFFSET) continue;
      const nr = centerRow + dr;
      const nc = centerCol + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      if (mode === 'wall') {
        updates.push({ row: nr, col: nc, type: 'wall' });
      } else if (mode === 'erase') {
        updates.push({ row: nr, col: nc, type: 'empty', customColor: undefined });
      } else if (mode === 'terrain') {
        updates.push({ row: nr, col: nc, type: 'empty', terrain: selectedTerrain });
      } else if (mode === 'color') {
        updates.push({ row: nr, col: nc, type: 'empty', customColor: selectedCustomColor });
      } else if (mode === 'weight') {
        const w = Math.max(1, Math.round(10 - dist));
        updates.push({
          row: nr,
          col: nc,
          type: 'empty',
          terrain: 'plains',
          customColor: weightToColor(w),
          weight: w,
        });
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
        color = cell.customColor ?? TERRAIN_COLORS[cell.terrain];
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

  // Viewport state (zoom + pan). Using refs to avoid triggering re-renders on
  // every wheel event; we redraw the canvas imperatively instead.
  const scaleRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  // Track the previous cell during a drag so Bresenham can fill gaps.
  const prevCell = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const isSpaceHeld = useRef(false);

  // Debounce timer for grid resize on container changes.
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Container size tracked in state so layout changes trigger a re-render and
  // resize the canvas accordingly.
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const cells = useGridStore((s) => s.cells);
  const interactionMode = useGridStore((s) => s.interactionMode);
  const selectedTerrain = useGridStore((s) => s.selectedTerrain);
  const selectedCustomColor = useGridStore((s) => s.selectedCustomColor);
  const showGrid = useGridStore((s) => s.showGrid);
  const brushSize = useGridStore((s) => s.brushSize);
  const setStartCell = useGridStore((s) => s.setStartCell);
  const setEndCell = useGridStore((s) => s.setEndCell);
  const setCellBatch = useGridStore((s) => s.setCellBatch);
  const resizeGrid = useGridStore((s) => s.resizeGrid);

  const result = useAlgorithmStore((s) => s.result);
  const currentStep = useAlgorithmStore((s) => s.currentStep);
  const resetAlgorithm = useAlgorithmStore((s) => s.reset);

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
        resetAlgorithm();
      }
    }, RESIZE_DEBOUNCE_MS);

    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [containerSize, resizeGrid, resetAlgorithm]);

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
    ctx.save();
    ctx.translate(panXRef.current, panYRef.current);
    ctx.scale(scaleRef.current, scaleRef.current);
    drawGrid(ctx, cells, exploredSet, frontierSet, pathSet, showGrid);
    ctx.restore();
  }, [cells, result, currentStep, showGrid, containerSize]);

  // Redraw whenever data or size changes.
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Scroll: plain scroll → brush size; Ctrl+scroll → zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        // Zoom toward cursor position.
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const oldScale = scaleRef.current;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * zoomFactor));
        panXRef.current = mouseX - (mouseX - panXRef.current) * (newScale / oldScale);
        panYRef.current = mouseY - (mouseY - panYRef.current) * (newScale / oldScale);
        scaleRef.current = newScale;
        redraw();
      } else {
        // Adjust brush size.
        const { brushSize: current, setBrushSize } = useGridStore.getState();
        const delta = e.deltaY < 0 ? 1 : -1;
        setBrushSize(current + delta);
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [redraw]);

  // Space key for pan mode — also update the canvas cursor imperatively.
  useEffect(() => {
    const canvas = canvasRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpaceHeld.current = true;
        if (canvas) canvas.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeld.current = false;
        isPanning.current = false;
        if (canvas) canvas.style.cursor = 'crosshair';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /** Convert a canvas-relative mouse position to grid [row, col]. */
  const canvasToCell = useCallback(
    (mouseX: number, mouseY: number): [number, number] | null => {
      const worldX = (mouseX - panXRef.current) / scaleRef.current;
      const worldY = (mouseY - panYRef.current) / scaleRef.current;
      const col = Math.floor(worldX / BASE_CELL_PX);
      const row = Math.floor(worldY / BASE_CELL_PX);
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
      // Middle-mouse or space+left-click → pan
      if (e.button === 1 || (e.button === 0 && isSpaceHeld.current)) {
        e.preventDefault();
        isPanning.current = true;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        return;
      }
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

      const updates = getBrushUpdates(
        row, col, brushSize, rows, cols,
        interactionMode, selectedTerrain, selectedCustomColor
      );
      if (updates.length > 0) setCellBatch(updates);
    },
    [canvasToCell, interactionMode, brushSize, rows, cols, selectedTerrain,
     selectedCustomColor, setCellBatch, setStartCell, setEndCell]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Pan
      if (isPanning.current && lastPanPos.current) {
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        panXRef.current += dx;
        panYRef.current += dy;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        redraw();
        return;
      }

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

      const updateMap = new Map<string, CellBatchUpdate>();
      for (let i = 1; i < line.length; i++) {
        const [lr, lc] = line[i];
        const updates = getBrushUpdates(
          lr, lc, brushSize, rows, cols,
          interactionMode, selectedTerrain, selectedCustomColor
        );
        for (const u of updates) {
          const key = `${u.row},${u.col}`;
          if (!updateMap.has(key)) updateMap.set(key, u);
        }
      }

      if (updateMap.size > 0) setCellBatch(Array.from(updateMap.values()));
      prevCell.current = [row, col];
    },
    [canvasToCell, interactionMode, brushSize, rows, cols,
     selectedTerrain, selectedCustomColor, setCellBatch, redraw]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isPanning.current = false;
    lastPanPos.current = null;
    prevCell.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = isSpaceHeld.current ? 'grab' : 'crosshair';
    }
  }, []);

  const handleResetView = useCallback(() => {
    scaleRef.current = 1;
    panXRef.current = 0;
    panYRef.current = 0;
    redraw();
  }, [redraw]);

  const isBrushMode =
    interactionMode !== 'start' && interactionMode !== 'end';

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Zoom controls overlay */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={() => {
            scaleRef.current = Math.min(MAX_SCALE, scaleRef.current * 1.25);
            redraw();
          }}
          className="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded flex items-center justify-center select-none"
          title="Zoom in (Ctrl+Scroll)"
        >
          +
        </button>
        <button
          onClick={() => {
            scaleRef.current = Math.max(MIN_SCALE, scaleRef.current / 1.25);
            redraw();
          }}
          className="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded flex items-center justify-center select-none"
          title="Zoom out (Ctrl+Scroll)"
        >
          −
        </button>
        <button
          onClick={handleResetView}
          className="h-7 px-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded select-none"
          title="Reset view"
        >
          1:1
        </button>
      </div>

      {/* Canvas container — fills available space */}
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

        {/* Brush size indicator */}
        {isBrushMode && (
          <div className="absolute bottom-2 left-2 text-xs text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded pointer-events-none select-none">
            Brush: {brushSize} • scroll to resize • Ctrl+scroll to zoom
          </div>
        )}

        {/* Grid resolution */}
        <div className="absolute bottom-2 right-2 text-xs text-slate-600 bg-slate-900/80 px-2 py-0.5 rounded pointer-events-none select-none">
          {rows}×{cols}
        </div>
      </div>
    </div>
  );
}
