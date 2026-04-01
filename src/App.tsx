import { ControlPanel } from './components/ControlPanel';
import { GridCanvas } from './components/GridCanvas';
import { Timeline } from './components/Timeline';
import { StatsPanel } from './components/StatsPanel';
import { TerrainLegend } from './components/TerrainLegend';

function App() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Top bar */}
      <ControlPanel />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <div className="flex-1 overflow-hidden bg-slate-950">
          <GridCanvas />
        </div>

        {/* Right sidebar */}
        <div className="w-48 bg-slate-800 border-l border-slate-700 overflow-y-auto flex-shrink-0">
          <StatsPanel />
          <TerrainLegend />
        </div>
      </div>

      {/* Bottom timeline */}
      <Timeline />
    </div>
  );
}

export default App;
