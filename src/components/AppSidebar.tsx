import { useState, useEffect, useRef } from 'react';
import {
  Trash2, Save, History, Play, Square,
  Undo2, Redo2, Link, Download, ChevronDown,
} from 'lucide-react';
import type { LayoutDirection } from '../hooks/useFlowGenerator';
import type { SimulationStatus } from './SimulationContext';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from './ui/sidebar';

interface AppSidebarProps {
  onClear: () => void;
  hasNodes: boolean;
  onSave: () => void;
  savedCount: number;
  onToggleHistory: () => void;
  direction: LayoutDirection;
  onToggleDirection: () => void;
  simulationStatus: SimulationStatus;
  onSimulate: () => void;
  onSimulationPause: () => void;
  onSimulationResume: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasGraph: boolean;
  onCopyLink: () => void;
  onExportJSON: () => void;
  onExportMermaid: () => void;
  onExportPng: () => void;
}

export function AppSidebar({
  onClear,
  hasNodes,
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
  onExportPng,
}: AppSidebarProps) {
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

  // Shared button class for action/share menu items
  const btn =
    'flex items-center gap-2 w-full px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors';

  return (
    <Sidebar>
      {/* ── Header ─────────────────────────────────────── */}
      <SidebarHeader>
        <span className="text-sm font-semibold text-white">⚡ AI Flow Creator</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSeparator />

        {/* ── Actions ─────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={btn}>
                <Undo2 size={13} /> Undo
              </button>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className={btn}>
                <Redo2 size={13} /> Redo
              </button>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <button onClick={onClear} disabled={!hasNodes || simulationRunning} className={btn}>
                <Trash2 size={13} /> Clear
              </button>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <button onClick={onSave} disabled={!hasNodes} className={btn}>
                <Save size={13} /> Save
              </button>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <button onClick={onToggleDirection} disabled={!hasNodes} className={btn}>
                <span className="text-sm leading-none">{direction === 'TB' ? '↔' : '↕'}</span>
                {direction === 'TB' ? 'Horizontal Layout' : 'Vertical Layout'}
              </button>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <button
                onClick={
                  simulationRunning ? onSimulationPause :
                  simulationStopped ? onSimulationResume :
                  onSimulate
                }
                disabled={!hasNodes}
                className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  simulationRunning || simulationStopped
                    ? 'text-cyan-400 hover:bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {simulationRunning ? <Square size={13} /> : <Play size={13} />}
                {simulationRunning
                  ? 'Stop Simulation'
                  : simulationStopped
                  ? 'Resume'
                  : simulationComplete
                  ? 'Restart'
                  : 'Simulate'}
              </button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Share & Export ──────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>Share & Export</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <button onClick={onCopyLink} disabled={!hasGraph} title="Copy shareable link" className={btn}>
                <Link size={13} /> Copy Link
              </button>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen(o => !o)}
                  disabled={!hasGraph}
                  className={btn}
                >
                  <Download size={13} /> Export <ChevronDown size={11} className="ml-auto" />
                </button>
                {exportOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 min-w-[140px]">
                    <button
                      onClick={() => { onExportPng(); setExportOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      PNG
                    </button>
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
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: History ─────────────────────────── */}
      <SidebarFooter>
        <button onClick={onToggleHistory} className={btn}>
          <History size={13} />
          History
          {savedCount > 0 && (
            <span className="ml-auto bg-gray-700 text-gray-300 rounded-full px-1.5 py-0 leading-4 text-xs">
              {savedCount}
            </span>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
