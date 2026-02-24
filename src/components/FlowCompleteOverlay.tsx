import { CheckCircle, RotateCcw } from 'lucide-react';

interface FlowCompleteOverlayProps {
  onRestart: () => void;
  onReset: () => void;
}

export function FlowCompleteOverlay({ onRestart, onReset }: FlowCompleteOverlayProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-gray-950/50"
      style={{ zIndex: 10 }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <CheckCircle size={48} className="text-cyan-400" />
        <h2 className="text-white text-xl font-semibold">Flow Complete</h2>
        <p className="text-gray-400 text-sm text-center">The simulation has reached the end node.</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            Restart
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
