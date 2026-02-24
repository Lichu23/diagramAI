import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import type { LayoutDir } from './NodeEditContext';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';
import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import AnimatedEdge from './edges/AnimatedEdge';
import { NodeEditContext, LayoutDirectionContext } from './NodeEditContext';
import { SimulationContext, type SimulationState } from './SimulationContext';

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  condition: ConditionNode,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

const EXPORT_PADDING = 80;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function FitViewOnLayout({ layoutVersion }: { layoutVersion: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (layoutVersion === 0) return;
    const id = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
    return () => clearTimeout(id);
  }, [layoutVersion, fitView]);
  return null;
}

function ExportButton() {
  const { getNodes } = useReactFlow();

  const handleExport = useCallback(() => {
    const nodes = getNodes();
    if (nodes.length === 0) return;

    const bounds = getNodesBounds(nodes);
    const imageWidth = Math.max(800, Math.round(bounds.width + EXPORT_PADDING * 2));
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
  }, [getNodes]);

  return (
    <Panel position="top-right">
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-900 border border-gray-700 hover:border-gray-500 rounded transition-colors"
      >
        <Download size={12} />
        Export PNG
      </button>
    </Panel>
  );
}

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeLabelChange: (id: string, label: string) => void;
  loading: boolean;
  direction: LayoutDir;
  layoutVersion: number;
  simulation: SimulationState;
}

export function FlowDiagram({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeLabelChange,
  loading,
  direction,
  layoutVersion,
  simulation,
}: FlowDiagramProps) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Generating your diagram...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <p className="text-gray-600 text-sm">Your diagram will appear here</p>
      </div>
    );
  }

  return (
    <NodeEditContext.Provider value={onNodeLabelChange}>
    <LayoutDirectionContext.Provider value={direction}>
    <SimulationContext.Provider value={simulation}>
    <div className="flex-1 min-h-0 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff10" />
        <Controls />
        {!isMobile && <MiniMap nodeColor={miniMapNodeColor} maskColor="rgba(0,0,0,0.4)" />}
        <ExportButton />
        <FitViewOnLayout layoutVersion={layoutVersion} />
      </ReactFlow>
    </div>
    </SimulationContext.Provider>
    </LayoutDirectionContext.Provider>
    </NodeEditContext.Provider>
  );
}

function miniMapNodeColor(node: Node): string {
  switch (node.type) {
    case 'start': return '#22c55e';
    case 'end': return '#ef4444';
    case 'action': return '#3b82f6';
    case 'condition': return '#facc15';
    default: return '#6b7280';
  }
}
