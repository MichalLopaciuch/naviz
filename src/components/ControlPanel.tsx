import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import type { AlgorithmType, HeuristicType, InteractionMode, TerrainType } from '../types';
import { ALGORITHM_LABELS } from '../algorithms';

const TERRAIN_OPTIONS: { value: TerrainType; label: string }[] = [
  { value: 'plains', label: 'Plains (×1)' },
  { value: 'forest', label: 'Forest (×3)' },
  { value: 'swamp', label: 'Swamp (×5)' },
  { value: 'mountain', label: 'Mountain (×10)' },
];

const DRAW_MODES: { value: InteractionMode; label: string }[] = [
  { value: 'wall', label: 'Wall' },
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'erase', label: 'Erase' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'color', label: 'Color' },
];

const GRID_MIN_ROWS = 5;
const GRID_MAX_ROWS = 100;
const GRID_MIN_COLS = 5;
const GRID_MAX_COLS = 150;

export function ControlPanel() {
  const {
    interactionMode,
    selectedTerrain,
    selectedCustomColor,
    rows,
    cols,
    clearGrid,
    clearWalls,
    setInteractionMode,
    setSelectedTerrain,
    setSelectedCustomColor,
    resizeGrid,
    cells,
    startCell,
    endCell,
  } = useGridStore();
  const { selectedAlgorithm, heuristic, allowDiagonals, setAlgorithm, setHeuristic, setAllowDiagonals, runAlgorithm, reset } = useAlgorithmStore();

  const handleRun = () => {
    if (!startCell || !endCell) {
      alert('Please place a start and end cell first.');
      return;
    }
    reset();
    runAlgorithm(cells, startCell, endCell);
  };

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(GRID_MAX_ROWS, Math.max(GRID_MIN_ROWS, parseInt(e.target.value, 10) || GRID_MIN_ROWS));
    resizeGrid(v, cols);
    reset();
  };

  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(GRID_MAX_COLS, Math.max(GRID_MIN_COLS, parseInt(e.target.value, 10) || GRID_MIN_COLS));
    resizeGrid(rows, v);
    reset();
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

      {/* Diagonal toggle */}
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={allowDiagonals}
          onChange={(e) => setAllowDiagonals(e.target.checked)}
          className="accent-blue-500"
        />
        Diagonals
      </label>

      {/* Draw modes */}
      <div className="flex items-center gap-1 border border-slate-600 rounded p-1">
        {DRAW_MODES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setInteractionMode(value)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              interactionMode === value
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

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

      {/* Grid size */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Grid</label>
        <input
          type="number"
          value={rows}
          min={GRID_MIN_ROWS}
          max={GRID_MAX_ROWS}
          onChange={handleRowsChange}
          className="w-14 bg-slate-700 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600"
          title="Rows"
        />
        <span className="text-xs text-slate-500">×</span>
        <input
          type="number"
          value={cols}
          min={GRID_MIN_COLS}
          max={GRID_MAX_COLS}
          onChange={handleColsChange}
          className="w-14 bg-slate-700 text-slate-100 text-sm rounded px-2 py-1 border border-slate-600"
          title="Columns"
        />
      </div>

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
