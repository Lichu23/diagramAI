import { useCallback, useEffect, useRef, useState } from 'react';
import { type Node, type Edge, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { toast, Toaster } from 'sonner';
import { useFlowGenerator } from './hooks/useFlowGenerator';
import { useFlowHistory } from './hooks/useFlowHistory';
import { useSimulation } from './hooks/useSimulation';
import { useUndoRedo } from './hooks/useUndoRedo';
import { AppSidebar } from './components/AppSidebar';
import { FlowDiagram } from './components/FlowDiagram';
import { PromptBar } from './components/PromptBar';
import { FlowHistory } from './components/FlowHistory';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './components/ui/sidebar';
import { exportJSON, exportMermaid } from './utils/exportFlow';
import { compressGraph, decompressGraph } from './utils/urlShare';
import type { FlowGraph } from './services/groq';
import type { SavedFlow } from './hooks/useFlowHistory';

type FlowSnapshot = { nodes: Node[]; edges: Edge[]; rawGraph: FlowGraph | null; prompt: string };

const SESSION_KEY = 'diagramai_session';

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
  const [historyOpen, setHistoryOpen] = useState(false);

  // --- Feature 1: Load diagram from URL on mount, or restore last session ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('flow');
    if (encoded) {
      decompressGraph(encoded)
        .then(graph => {
          restoreFromGraph(graph);
          const p = params.get('prompt');
          if (p) setPrompt(decodeURIComponent(p));
        })
        .catch(() => toast.error('Could not load shared diagram'));
      return;
    }
    // Fall back to last auto-saved session
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw) as FlowSnapshot;
      if (session.nodes?.length > 0) {
        setTimeout(() => {
          restore(session.nodes, session.edges, session.rawGraph ?? undefined);
          if (session.prompt) setPrompt(session.prompt);
        }, 0);
      }
    } catch {
      // Corrupted session — ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save current session to localStorage (debounced 500ms)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ nodes, edges, rawGraph, prompt }));
      } catch {
        // Storage quota exceeded — ignore silently
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [nodes, edges, rawGraph, prompt]);

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

  // --- Action handlers ---
  const handleClear = () => {
    undoRedo.push({ nodes, edges, rawGraph, prompt });
    clear();
    localStorage.removeItem(SESSION_KEY);
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

  const handleExportPng = useCallback(() => {
    if (nodes.length === 0) return;
    const EXPORT_PADDING = 40;
    const bounds = getNodesBounds(nodes);
    const imageWidth  = Math.max(800, Math.round(bounds.width  + EXPORT_PADDING * 2));
    const imageHeight = Math.max(600, Math.round(bounds.height + EXPORT_PADDING * 2));
    const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.1, 4, 0);
    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!viewportEl) return;
    toPng(viewportEl, {
      backgroundColor: '#030712',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl: string) => {
      const a = document.createElement('a');
      a.download = 'flow-diagram.png';
      a.href = dataUrl;
      a.click();
    });
  }, [nodes]);

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
    <SidebarProvider>
      <Toaster theme="dark" position="bottom-right" richColors />

      <AppSidebar
        onClear={handleClear}
        hasNodes={nodes.length > 0}
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
        onExportPng={handleExportPng}
      />

      <SidebarInset className="flex flex-col">
        <SidebarTrigger />
        <div className="relative flex-1 min-h-0 flex flex-col">
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
          {/* Floating prompt bar — absolutely positioned over canvas */}
          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            <div className="pointer-events-auto max-w-3xl mx-auto">
              <PromptBar
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={generate}
                loading={loading}
                hasNodes={nodes.length > 0}
              />
            </div>
          </div>
        </div>
      </SidebarInset>

      {historyOpen && (
        <FlowHistory
          flows={flows}
          onLoad={handleLoad}
          onDelete={remove}
          onRename={rename}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </SidebarProvider>
  );
}

export default App;
