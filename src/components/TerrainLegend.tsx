import { COLORS } from '../constants';

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
    </div>
  );
}
