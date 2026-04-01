import { create } from 'zustand';
import type { AlgorithmType, HeuristicType, AlgorithmResult, Cell } from '../types';
import { ALGORITHMS } from '../algorithms';
import { WASM_ALGORITHMS, initWasm, isWasmSupported } from '../algorithms/wasm';

/** Duration of the auto-play animation in milliseconds. */
const ANIMATION_DURATION_MS = 750;

// Module-level RAF handle so it can be cancelled from outside the store action.
let animRafId: number | null = null;

function cancelAnimation() {
  if (animRafId !== null) {
    cancelAnimationFrame(animRafId);
    animRafId = null;
  }
}

interface AlgorithmState {
  selectedAlgorithm: AlgorithmType;
  heuristic: HeuristicType;
  useWasm: boolean;
  wasmLoading: boolean;
  result: AlgorithmResult | null;
  currentStep: number;
  isAnimating: boolean;
  isRunning: boolean;
  error: string | null;
  setAlgorithm: (alg: AlgorithmType) => void;
  setHeuristic: (h: HeuristicType) => void;
  setUseWasm: (value: boolean) => void;
  runAlgorithm: (cells: Cell[][], start: [number, number], end: [number, number]) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
}

export const useAlgorithmStore = create<AlgorithmState>((set, get) => ({
  selectedAlgorithm: 'astar',
  heuristic: 'manhattan',
  useWasm: false,
  wasmLoading: false,
  result: null,
  currentStep: 0,
  isAnimating: false,
  isRunning: false,
  error: null,

  setAlgorithm: (alg) => set({ selectedAlgorithm: alg }),
  setHeuristic: (h) => set({ heuristic: h }),
  setUseWasm: (value) => set({ useWasm: value }),

  runAlgorithm: (cells, start, end) => {
    if (get().isRunning || get().wasmLoading) return;
    cancelAnimation();
    const { selectedAlgorithm, heuristic, useWasm } = get();
    set({ isRunning: true, error: null });

    const execute = () => {
      try {
        const fn = useWasm ? WASM_ALGORITHMS[selectedAlgorithm] : ALGORITHMS[selectedAlgorithm];
        const result = fn(cells, start, end, { heuristic, allowDiagonals: true });
        const total = result.exploredOrder.length;
        // Start the animation from step 0.
        set({ result, currentStep: 0, isRunning: false, isAnimating: true });

        const startTime = performance.now();
        const tick = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
          const step = Math.round(progress * total);
          set({ currentStep: step });
          if (progress < 1) {
            animRafId = requestAnimationFrame(tick);
          } else {
            animRafId = null;
            set({ isAnimating: false });
          }
        };
        animRafId = requestAnimationFrame(tick);
      } catch (e) {
        set({ error: String(e), isRunning: false, isAnimating: false });
      }
    };

    if (useWasm && isWasmSupported()) {
      set({ wasmLoading: true });
      initWasm()
        .then(() => {
          set({ wasmLoading: false });
          execute();
        })
        .catch((e: unknown) => {
          set({ error: String(e), isRunning: false, isAnimating: false, wasmLoading: false });
        });
    } else {
      execute();
    }
  },

  /** Manually seeking the timeline cancels any in-progress animation. */
  setCurrentStep: (step) => {
    cancelAnimation();
    set({ currentStep: step, isAnimating: false });
  },

  reset: () => {
    cancelAnimation();
    set({ result: null, currentStep: 0, error: null, isAnimating: false });
  },
}));
