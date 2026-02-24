import { useCallback, useEffect, useRef, useState } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { toast, Toaster } from 'sonner';
import { useFlowGenerator } from './hooks/useFlowGenerator';
import { useFlowHistory } from './hooks/useFlowHistory';
import { useSimulation } from './hooks/useSimulation';
import { useUndoRedo } from './hooks/useUndoRedo';
import { FlowEditor } from './components/FlowEditor';
import { FlowDiagram } from './components/FlowDiagram';
import { FlowHistory } from './components/FlowHistory';
import { Toolbar } from './components/Toolbar';
import { exportJSON, exportMermaid } from './utils/exportFlow';
import { compressGraph, decompressGraph } from './utils/urlShare';
import type { FlowGraph } from './services/groq';
import type { SavedFlow } from './hooks/useFlowHistory';

type FlowSnapshot = { nodes: Node[]; edges: Edge[]; rawGraph: FlowGraph | null; prompt: string };

function App() {
  const {
    nodes, edges, onNodesChange, onEdgesChange,
    loading, direction, rawGraph, layoutVersion,
    generationId, generate, toggleDirection,
    updateNodeLabel, clear, restore, restoreFromGraph,
  } = useFlowGenerator();
  const { flows, save, remove, rename } = useFlowHistory();
  const simulation = useSimulation(nodes, edges);
  const undoRedo = useUndoRedo<FlowSnapshot>();

  const [prompt, setPrompt] = useState('');
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // --- Feature 1: Load diagram from URL on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('flow');
    if (!encoded) return;
    decompressGraph(encoded)
      .then(graph => {
        restoreFromGraph(graph);
        const p = params.get('prompt');
        if (p) setPrompt(decodeURIComponent(p));
      })
      .catch(() => toast.error('Could not load shared diagram'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Feature 2: Push undo snapshot after successful generation ---
  const prevGenerationId = useRef(0);
  useEffect(() => {
    if (generationId === 0 || generationId === prevGenerationId.current) return;
    prevGenerationId.current = generationId;
    undoRedo.push({ nodes, edges, rawGraph, prompt });
  }, [generationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Feature 2: Undo/Redo handlers ---
  const handleUndo = useCallback(() => {
    const s = undoRedo.undo();
    if (!s) return;
    setPrompt(s.prompt);
    restore(s.nodes, s.edges, s.rawGraph ?? undefined);
  }, [undoRedo, restore]);

  const handleRedo = useCallback(() => {
    const s = undoRedo.redo();
    if (!s) return;
    setPrompt(s.prompt);
    restore(s.nodes, s.edges, s.rawGraph ?? undefined);
  }, [undoRedo, restore]);

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // --- Action handlers (push snapshot before mutation for clear/load) ---
  const handleClear = () => {
    undoRedo.push({ nodes, edges, rawGraph, prompt });
    clear();
  };

  const handleNodeLabelChange = (id: string, label: string) => {
    undoRedo.push({ nodes, edges, rawGraph, prompt });
    updateNodeLabel(id, label);
  };

  const handleSave = () => {
    if (nodes.length > 0 && prompt.trim()) {
      save(prompt, nodes, edges, rawGraph ?? undefined);
    }
  };

  const handleLoad = (flow: SavedFlow) => {
    undoRedo.push({ nodes, edges, rawGraph, prompt });
    setPrompt(flow.prompt);
    restore(flow.nodes, flow.edges, flow.graph);
    setHistoryOpen(false);
  };

  // --- Feature 3: Export ---
  const handleExportJSON = () => { if (rawGraph) exportJSON(rawGraph); };
  const handleExportMermaid = () => { if (rawGraph) exportMermaid(rawGraph); };

  // --- Feature 1: Copy shareable link ---
  const handleCopyLink = async () => {
    if (!rawGraph) return;
    try {
      const encoded = await compressGraph(rawGraph);
      const url = new URL(window.location.href);
      url.searchParams.set('flow', encoded);
      if (prompt.trim()) {
        url.searchParams.set('prompt', encodeURIComponent(prompt.trim()));
      } else {
        url.searchParams.delete('prompt');
      }
      await navigator.clipboard.writeText(url.toString());
      window.history.replaceState(null, '', url.toString());
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Toaster theme="dark" position="bottom-right" richColors />

      <header className="px-4 sm:px-6 py-3 border-b border-gray-800 flex items-center gap-3 shrink-0">
        <h1 className="text-base sm:text-lg font-semibold text-white">AI Flow Creator</h1>
        <span className="hidden sm:inline text-xs text-gray-500">Describe a process, get a diagram</span>
      </header>

      <div className="shrink-0">
        {!editorCollapsed && (
          <FlowEditor
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={generate}
            loading={loading}
          />
        )}
        <Toolbar
          onClear={handleClear}
          hasNodes={nodes.length > 0}
          editorCollapsed={editorCollapsed}
          onToggleEditor={() => setEditorCollapsed(c => !c)}
          onSave={handleSave}
          savedCount={flows.length}
          onToggleHistory={() => setHistoryOpen(o => !o)}
          direction={direction}
          onToggleDirection={toggleDirection}
          simulationStatus={simulation.status}
          onSimulate={simulation.start}
          onSimulationPause={simulation.pause}
          onSimulationResume={simulation.resume}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          hasGraph={rawGraph !== null}
          onCopyLink={handleCopyLink}
          onExportJSON={handleExportJSON}
          onExportMermaid={handleExportMermaid}
        />
      </div>

      <FlowDiagram
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeLabelChange={handleNodeLabelChange}
        loading={loading}
        direction={direction}
        layoutVersion={layoutVersion}
        simulation={simulation}
      />

      {historyOpen && (
        <FlowHistory
          flows={flows}
          onLoad={handleLoad}
          onDelete={remove}
          onRename={rename}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
