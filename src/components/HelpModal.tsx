import { useEffect } from 'react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'W', description: 'Wall mode' },
  { key: 'S', description: 'Start / End mode' },
  { key: 'E', description: 'Erase mode' },
  { key: 'T', description: 'Terrain mode / cycle terrain type' },
  { key: 'A', description: 'Cycle algorithm' },
  { key: 'R', description: 'Reset canvas (with confirmation)' },
  { key: '/ or ?', description: 'Show this help' },
  { key: 'Ctrl + Scroll', description: 'Step through timeline' },
  { key: 'Left click', description: 'Place start (in Start/End mode)' },
  { key: 'Right click', description: 'Place end (in Start/End mode)' },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-100 mb-3">Keyboard &amp; Mouse Shortcuts</h2>
        <table className="w-full text-sm text-slate-300">
          <tbody>
            {SHORTCUTS.map(({ key, description }) => (
              <tr key={key} className="border-t border-slate-700">
                <td className="py-1.5 pr-4 whitespace-nowrap">
                  <kbd className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">
                    {key}
                  </kbd>
                </td>
                <td className="py-1.5 text-slate-400">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-slate-600 hover:bg-slate-500 text-white py-1.5 rounded text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
