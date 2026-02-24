import { useEffect, useRef, useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, Save, History, Play, Square, Undo2, Redo2, Link, Download } from 'lucide-react';
import type { LayoutDirection } from '../hooks/useFlowGenerator';
import type { SimulationStatus } from './SimulationContext';

interface ToolbarProps {
  onClear: () => void;
  hasNodes: boolean;
  editorCollapsed: boolean;
  onToggleEditor: () => void;
  onSave: () => void;
  savedCount: number;
  onToggleHistory: () => void;
  direction: LayoutDirection;
  onToggleDirection: () => void;
  simulationStatus: SimulationStatus;
  onSimulate: () => void;
  onSimulationPause: () => void;
  onSimulationResume: () => void;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Share
  hasGraph: boolean;
  onCopyLink: () => void;
  // Export
  onExportJSON: () => void;
  onExportMermaid: () => void;
}

export function Toolbar({
  onClear,
  hasNodes,
  editorCollapsed,
  onToggleEditor,
  onSave,
  savedCount,
  onToggleHistory,
  direction,
  onToggleDirection,
  simulationStatus,
  onSimulate,
  onSimulationPause,
  onSimulationResume,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasGraph,
  onCopyLink,
  onExportJSON,
  onExportMermaid,
}: ToolbarProps) {
  const simulationRunning = simulationStatus === 'running' || simulationStatus === 'paused';
  const simulationStopped = simulationStatus === 'stopped';
  const simulationComplete = simulationStatus === 'complete';

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-wrap">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <Undo2 size={12} />
        Undo
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <Redo2 size={12} />
        Redo
      </button>

      <button
        onClick={onClear}
        disabled={!hasNodes || simulationRunning}
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <Trash2 size={12} />
        Clear
      </button>

      <button
        onClick={onSave}
        disabled={!hasNodes}
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <Save size={12} />
        Save
      </button>

      <button
        onClick={onToggleDirection}
        disabled={!hasNodes}
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        {direction === 'TB' ? '↔' : '↕'}
        {direction === 'TB' ? 'Horizontal' : 'Vertical'}
      </button>

      <button
        onClick={onToggleHistory}
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <History size={12} />
        History
        {savedCount > 0 && (
          <span className="bg-gray-700 text-gray-300 text-xs rounded-full px-1.5 py-0 leading-4">
            {savedCount}
          </span>
        )}
      </button>

      <button
        onClick={
          simulationRunning ? onSimulationPause :
          simulationStopped ? onSimulationResume :
          onSimulate
        }
        disabled={!hasNodes}
        className={`flex items-center gap-1.5 px-3 py-1 text-xs border rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          simulationRunning || simulationStopped
            ? 'text-cyan-400 border-cyan-700 hover:border-cyan-500'
            : 'text-gray-400 hover:text-white border-gray-700 hover:border-gray-500'
        }`}
      >
        {simulationRunning ? <Square size={12} /> : <Play size={12} />}
        {simulationRunning ? 'Stop' : simulationStopped ? 'Resume' : simulationComplete ? 'Restart' : 'Simulate'}
      </button>

      <button
        onClick={onCopyLink}
        disabled={!hasGraph}
        title="Copy shareable link"
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <Link size={12} />
        Copy Link
      </button>

      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen(o => !o)}
          disabled={!hasGraph}
          className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded transition-colors"
        >
          <Download size={12} />
          Export
          <ChevronDown size={12} />
        </button>
        {exportOpen && (
          <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 min-w-[140px]">
            <button
              onClick={() => { onExportJSON(); setExportOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() => { onExportMermaid(); setExportOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Mermaid (.md)
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onToggleEditor}
        className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        {editorCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        {editorCollapsed ? 'Show Editor' : 'Hide Editor'}
      </button>
    </div>
  );
}
