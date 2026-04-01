import { create } from 'zustand';
import type { AlgorithmType, HeuristicType, AlgorithmResult, Cell } from '../types';
import { ALGORITHMS } from '../algorithms';

/** Duration of the auto-play animation in milliseconds. */
const ANIMATION_DURATION_MS = 1500;

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
  result: AlgorithmResult | null;
  currentStep: number;
  isAnimating: boolean;
  isRunning: boolean;
  error: string | null;
  setAlgorithm: (alg: AlgorithmType) => void;
  setHeuristic: (h: HeuristicType) => void;
  runAlgorithm: (cells: Cell[][], start: [number, number], end: [number, number]) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
}

export const useAlgorithmStore = create<AlgorithmState>((set, get) => ({
  selectedAlgorithm: 'astar',
  heuristic: 'manhattan',
  result: null,
  currentStep: 0,
  isAnimating: false,
  isRunning: false,
  error: null,

  setAlgorithm: (alg) => set({ selectedAlgorithm: alg }),
  setHeuristic: (h) => set({ heuristic: h }),

  runAlgorithm: (cells, start, end) => {
    cancelAnimation();
    const { selectedAlgorithm, heuristic } = get();
    const fn = ALGORITHMS[selectedAlgorithm];
    set({ isRunning: true, error: null });
    try {
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
