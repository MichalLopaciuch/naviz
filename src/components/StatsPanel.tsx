import { useAlgorithmStore } from '../store/algorithmStore';

export function StatsPanel() {
  const result = useAlgorithmStore((s) => s.result);
  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm);
  const useWasm = useAlgorithmStore((s) => s.useWasm);
  const wasmLoading = useAlgorithmStore((s) => s.wasmLoading);

  if (!result) {
    return (
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Stats</h2>
        <p className="text-xs text-slate-500">No results yet. Run an algorithm.</p>
      </div>
    );
  }

  const { stats } = result;
  const engineLabel = useWasm ? 'WASM' : 'JS';
  const engineClass = useWasm
    ? 'bg-violet-900 text-violet-200'
    : 'bg-slate-700 text-slate-400';

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Stats</h2>
      {wasmLoading && (
        <p className="text-xs text-violet-400 mb-2">Loading WASM…</p>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Algorithm</span>
          <span className="font-medium text-blue-400 uppercase">{selectedAlgorithm}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Engine</span>
          <span className={`px-2 py-0.5 rounded font-mono ${engineClass}`}>
            {engineLabel}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Cells Explored</span>
          <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-mono">
            {stats.cellsExplored}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Path Length</span>
          <span className={`px-2 py-0.5 rounded font-mono ${stats.pathLength ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {stats.pathLength ?? 'None'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Compute Time</span>
          <span className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono">
            {stats.computeTimeMs.toFixed(2)}ms
          </span>
        </div>
      </div>
    </div>
  );
}
