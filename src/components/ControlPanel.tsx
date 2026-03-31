import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import type { AlgorithmType, HeuristicType, InteractionMode } from '../types';
import { ALGORITHM_LABELS } from '../algorithms';

const DRAW_MODES: { value: InteractionMode; label: string }[] = [
  { value: 'wall', label: 'Wall' },
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'erase', label: 'Erase' },
];

export function ControlPanel() {
  const {
    interactionMode,
    showGrid,
    clearGrid,
    clearWalls,
    setInteractionMode,
    setShowGrid,
    cells,
    startCell,
    endCell,
  } = useGridStore();
  const { selectedAlgorithm, heuristic, setAlgorithm, setHeuristic, runAlgorithm, reset } =
    useAlgorithmStore();

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
