import { create } from 'zustand';
import type { AlgorithmType, HeuristicType, AlgorithmResult, Cell } from '../types';
import { ALGORITHMS } from '../algorithms';

interface AlgorithmState {
  selectedAlgorithm: AlgorithmType;
  heuristic: HeuristicType;
  result: AlgorithmResult | null;
  currentStep: number;
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
  isRunning: false,
  error: null,

  setAlgorithm: (alg) => set({ selectedAlgorithm: alg }),
  setHeuristic: (h) => set({ heuristic: h }),

  runAlgorithm: (cells, start, end) => {
    const { selectedAlgorithm, heuristic } = get();
    const fn = ALGORITHMS[selectedAlgorithm];
    set({ isRunning: true, error: null });
    try {
      const result = fn(cells, start, end, { heuristic, allowDiagonals: true });
      set({ result, currentStep: result.exploredOrder.length, isRunning: false });
    } catch (e) {
      set({ error: String(e), isRunning: false });
    }
  },

  setCurrentStep: (step) => set({ currentStep: step }),

  reset: () => set({ result: null, currentStep: 0, error: null }),
}));
