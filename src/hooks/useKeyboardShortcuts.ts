import { useEffect, useRef } from 'react';
import { useGridStore } from '../store/gridStore';
import { useAlgorithmStore } from '../store/algorithmStore';
import type { AlgorithmType, TerrainType } from '../types';

const ALGORITHM_CYCLE: AlgorithmType[] = ['astar', 'dijkstra', 'bfs', 'dfs'];
const TERRAIN_CYCLE: TerrainType[] = ['forest', 'mountain'];

/** Number of timeline steps advanced per 100px of scroll distance. */
const SCROLL_STEPS_PER_100PX = 50;

export function useKeyboardShortcuts(onHelp: () => void) {
  const onHelpRef = useRef(onHelp);
  useEffect(() => {
  }, [onHelp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when the user is typing in a form field.
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

      const {
        interactionMode,
        selectedTerrain,
        setInteractionMode,
        setSelectedTerrain,
        clearGrid,
      } = useGridStore.getState();
      const { selectedAlgorithm, setAlgorithm, reset } = useAlgorithmStore.getState();

      switch (e.key) {
        case 'w':
        case 'W':
          setInteractionMode('wall');
          break;
        case 's':
        case 'S':
          setInteractionMode('start-end');
          break;
        case 'e':
        case 'E':
          setInteractionMode('erase');
          break;
        case 't':
        case 'T':
          if (interactionMode !== 'terrain') {
            setInteractionMode('terrain');
          } else {
            const idx = TERRAIN_CYCLE.indexOf(selectedTerrain as TerrainType);
            const nextIdx = idx < 0 ? 0 : (idx + 1) % TERRAIN_CYCLE.length;
            setSelectedTerrain(TERRAIN_CYCLE[nextIdx]);
          }
          break;
        case 'a':
        case 'A': {
          const idx = ALGORITHM_CYCLE.indexOf(selectedAlgorithm);
          setAlgorithm(ALGORITHM_CYCLE[(idx + 1) % ALGORITHM_CYCLE.length]);
          break;
        }
        case 'r':
        case 'R':
          if (window.confirm('Reset the canvas? This will clear all walls, terrain, and start/end points.')) {
            clearGrid();
            reset();
          }
          break;
        case '/':
        case '?':
          onHelpRef.current();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      const { result, currentStep, setCurrentStep } = useAlgorithmStore.getState();
      if (!result) return;
      e.preventDefault();
      const total = result.exploredOrder.length;
      const delta = Math.round((e.deltaY / 100) * SCROLL_STEPS_PER_100PX) || (e.deltaY > 0 ? 1 : -1);
      setCurrentStep(Math.max(0, Math.min(total, currentStep + delta)));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);
}
