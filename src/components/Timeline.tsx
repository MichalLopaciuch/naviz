import { useAlgorithmStore } from '../store/algorithmStore';

export function Timeline() {
  const result = useAlgorithmStore((s) => s.result);
  const currentStep = useAlgorithmStore((s) => s.currentStep);
  const setCurrentStep = useAlgorithmStore((s) => s.setCurrentStep);

  if (!result) {
    return (
      <div className="flex items-center justify-center h-12 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
        Run an algorithm to enable the timeline
      </div>
    );
  }

  const total = result.exploredOrder.length;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-t border-slate-700">
      <span className="text-xs text-slate-400 whitespace-nowrap">
        Step {currentStep} / {total}
      </span>
      <input
        type="range"
        min={0}
        max={total}
        value={currentStep}
        onChange={(e) => setCurrentStep(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex gap-1">
        <button
          onClick={() => setCurrentStep(0)}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded"
        >
          |◀
        </button>
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded"
        >
          ◀
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(total, currentStep + 1))}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded"
        >
          ▶
        </button>
        <button
          onClick={() => setCurrentStep(total)}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded"
        >
          ▶|
        </button>
      </div>
    </div>
  );
}
