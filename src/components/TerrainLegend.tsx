import { TERRAIN_COLORS, TERRAIN_COSTS, COLORS } from '../constants';
import type { TerrainType } from '../types';

const CELL_LEGEND = [
  { color: COLORS.start, label: 'Start' },
  { color: COLORS.end, label: 'End' },
  { color: COLORS.wall, label: 'Wall' },
  { color: COLORS.explored, label: 'Explored' },
  { color: COLORS.frontier, label: 'Frontier' },
  { color: COLORS.path, label: 'Path' },
];

export function TerrainLegend() {
  return (
    <div className="p-4 border-t border-slate-700">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Legend</h2>
      <div className="space-y-1.5">
        {CELL_LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-sm border border-slate-600 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-slate-400 mt-4 mb-2">Terrain Costs</h3>
      <div className="space-y-1.5">
        {(Object.keys(TERRAIN_COLORS) as TerrainType[]).map((terrain) => (
          <div key={terrain} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border border-slate-600 flex-shrink-0"
                style={{ backgroundColor: TERRAIN_COLORS[terrain] }}
              />
              <span className="text-xs text-slate-400 capitalize">{terrain}</span>
            </div>
            <span className="text-xs font-mono text-slate-500">×{TERRAIN_COSTS[terrain]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
