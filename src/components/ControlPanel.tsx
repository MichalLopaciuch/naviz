import { useEffect } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import type { AlgorithmType, HeuristicType, InteractionMode, TerrainType } from '../types';
import { ALGORITHM_LABELS } from '../algorithms';
import { MIN_BRUSH_SIZE, MAX_BRUSH_SIZE } from '../constants';

const TERRAIN_OPTIONS: { value: TerrainType; label: string }[] = [
  { value: 'plains', label: 'Plains (×1)' },
  { value: 'forest', label: 'Forest (×3)' },
  { value: 'swamp', label: 'Swamp (×5)' },
  { value: 'mountain', label: 'Mountain (×10)' },
];

const DRAW_MODES: { value: InteractionMode; label: string; requiresDijkstra?: boolean }[] = [
  { value: 'wall', label: 'Wall' },
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'erase', label: 'Erase' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'color', label: 'Color' },
  { value: 'weight', label: 'Weight', requiresDijkstra: true },
];

export function ControlPanel() {
  const {
    interactionMode,
    selectedTerrain,
    selectedCustomColor,
    showGrid,
    brushSize,
    clearGrid,
    clearWalls,
    setInteractionMode,
    setSelectedTerrain,
    setSelectedCustomColor,
    setShowGrid,
    setBrushSize,
    cells,
    startCell,
    endCell,
  } = useGridStore();
  const { selectedAlgorithm, heuristic, setAlgorithm, setHeuristic, runAlgorithm, reset } =
    useAlgorithmStore();

  // If algorithm changes away from Dijkstra while in weight mode, switch to wall.
  useEffect(() => {
    if (selectedAlgorithm !== 'dijkstra' && interactionMode === 'weight') {
      setInteractionMode('wall');
    }
  }, [selectedAlgorithm, interactionMode, setInteractionMode]);

  const handleRun = () => {
    if (!startCell || !endCell) {
      alert('Please place a start and end cell first.');
      return;
    }
    reset();
    runAlgorithm(cells, startCell, endCell);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700">
      {/* Algorithm */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Algorithm</label>
        <select
          className="bg-slate-700 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600"
          value={selectedAlgorithm}
          onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
        >
          {(Object.keys(ALGORITHM_LABELS) as AlgorithmType[]).map((key) => (
            <option key={key} value={key}>{ALGORITHM_LABELS[key]}</option>
          ))}
        </select>
      </div>

      {/* Heuristic (A* only) */}
      {selectedAlgorithm === 'astar' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Heuristic</label>
          <select
            className="bg-slate-700 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600"
            value={heuristic}
            onChange={(e) => setHeuristic(e.target.value as HeuristicType)}
          >
            <option value="manhattan">Manhattan</option>
            <option value="euclidean">Euclidean</option>
          </select>
        </div>
      )}

      {/* Draw modes */}
      <div className="flex items-center gap-1 border border-slate-600 rounded p-1">
        {DRAW_MODES.map(({ value, label, requiresDijkstra }) => {
          const disabled = requiresDijkstra && selectedAlgorithm !== 'dijkstra';
          return (
            <button
              key={value}
              onClick={() => !disabled && setInteractionMode(value)}
              disabled={disabled}
              title={disabled ? 'Weight brush is only available with Dijkstra' : undefined}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                interactionMode === value
                  ? 'bg-blue-600 text-white'
                  : disabled
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Brush size */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Brush</label>
        <input
          type="range"
          min={MIN_BRUSH_SIZE}
          max={MAX_BRUSH_SIZE}
          step={1}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-20 accent-blue-500"
          title="Brush size (or scroll on canvas)"
        />
        <span className="text-xs text-slate-400 w-4 text-right">{brushSize}</span>
      </div>

      {/* Show Grid toggle */}
      <button
        onClick={() => setShowGrid(!showGrid)}
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          showGrid
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
        }`}
      >
        Grid
      </button>

      {/* Terrain picker (shown when terrain mode is active) */}
      {interactionMode === 'terrain' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Terrain</label>
          <select
            className="bg-slate-700 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600"
            value={selectedTerrain}
            onChange={(e) => setSelectedTerrain(e.target.value as TerrainType)}
          >
            {TERRAIN_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Color picker (shown when color mode is active) */}
      {interactionMode === 'color' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Color</label>
          <input
            type="color"
            value={selectedCustomColor}
            onChange={(e) => setSelectedCustomColor(e.target.value)}
            className="w-8 h-7 rounded border border-slate-600 bg-slate-700 cursor-pointer p-0.5"
            title="Pick paint color"
          />
          <span className="text-xs font-mono text-slate-400">{selectedCustomColor}</span>
        </div>
      )}

      {/* Actions */}
      <button
        onClick={handleRun}
        className="ml-auto bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
      >
        ▶ Run
      </button>
      <button
        onClick={clearWalls}
        className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-3 py-1.5 rounded transition-colors"
      >
        Clear Walls
      </button>
      <button
        onClick={() => { clearGrid(); reset(); }}
        className="bg-red-800 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
      >
        Clear All
      </button>
    </div>
  );
}
