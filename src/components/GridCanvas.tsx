import { useRef, useEffect, useCallback, useState } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import { COLORS, TERRAIN_COLORS } from '../constants';
import { bresenhamLine } from '../utils/bresenham';
import type { Cell } from '../types';

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cells: Cell[][],
  exploredSet: Set<string>,
  frontierSet: Set<string>,
  pathSet: Set<string>,
  cellW: number,
  cellH: number
) {
  const rows = cells.length;
  const cols = cells[0].length;

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
      ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
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

  // Container size tracked in state so layout changes trigger a re-render and
  // resize the canvas accordingly.
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const cells = useGridStore((s) => s.cells);
  const interactionMode = useGridStore((s) => s.interactionMode);
  const selectedTerrain = useGridStore((s) => s.selectedTerrain);
  const selectedCustomColor = useGridStore((s) => s.selectedCustomColor);
  const setCell = useGridStore((s) => s.setCell);
  const setStartCell = useGridStore((s) => s.setStartCell);
  const setEndCell = useGridStore((s) => s.setEndCell);

  const result = useAlgorithmStore((s) => s.result);
  const currentStep = useAlgorithmStore((s) => s.currentStep);

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  // Derived cell dimensions based on container size.
  const cellW = cols > 0 ? containerSize.w / cols : 0;
  const cellH = rows > 0 ? containerSize.h / rows : 0;

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

  // Build the sets needed for algorithm overlay and redraw.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || cellW === 0 || cellH === 0) return;
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
    drawGrid(ctx, cells, exploredSet, frontierSet, pathSet, cellW, cellH);
    ctx.restore();
  }, [cells, result, currentStep, cellW, cellH]);

  // Redraw whenever data or size changes.
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Prevent default middle-mouse scroll behaviour on the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const oldScale = scaleRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * zoomFactor));

      // Zoom toward cursor position.
      panXRef.current = mouseX - (mouseX - panXRef.current) * (newScale / oldScale);
      panYRef.current = mouseY - (mouseY - panYRef.current) * (newScale / oldScale);
      scaleRef.current = newScale;
      redraw();
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
      const col = Math.floor(worldX / cellW);
      const row = Math.floor(worldY / cellH);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
      return [row, col];
    },
    [cellW, cellH, rows, cols]
  );

  /** Paint a single cell according to the current interaction mode. */
  const paintCell = useCallback(
    (row: number, col: number) => {
      if (interactionMode === 'wall') {
        setCell(row, col, 'wall');
      } else if (interactionMode === 'erase') {
        // Passing no terrain/customColor clears them back to defaults.
        setCell(row, col, 'empty');
      } else if (interactionMode === 'terrain') {
        setCell(row, col, 'empty', selectedTerrain);
      } else if (interactionMode === 'color') {
        setCell(row, col, 'empty', undefined, selectedCustomColor);
      }
    },
    [interactionMode, selectedTerrain, selectedCustomColor, setCell]
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
      paintCell(row, col);
    },
    [canvasToCell, interactionMode, paintCell, setStartCell, setEndCell]
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

      // Use Bresenham to fill all cells between previous and current position.
      if (prevCell.current) {
        const [pr, pc] = prevCell.current;
        const line = bresenhamLine(pr, pc, row, col);
        // Skip the first point (already painted on previous event).
        for (let i = 1; i < line.length; i++) {
          const [lr, lc] = line[i];
          if (
            interactionMode === 'wall' ||
            interactionMode === 'erase' ||
            interactionMode === 'terrain' ||
            interactionMode === 'color'
          ) {
            paintCell(lr, lc);
          }
        }
      }
      prevCell.current = [row, col];
    },
    [canvasToCell, interactionMode, paintCell, redraw]
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
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            scaleRef.current = Math.max(MIN_SCALE, scaleRef.current / 1.25);
            redraw();
          }}
          className="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded flex items-center justify-center select-none"
          title="Zoom out"
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
      <div ref={containerRef} className="flex-1 overflow-hidden">
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
      </div>
    </div>
  );
}
