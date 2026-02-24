import { useCallback, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  MarkerType,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { toast } from 'sonner';
import { generateFlow, type FlowNode, type FlowEdge, type FlowGraph } from '../services/groq';
import { RateLimitError } from '../utils/rateLimit';

export type LayoutDirection = 'TB' | 'LR';

function getNodeSize(type: string): { width: number; height: number } {
  if (type === 'condition') return { width: 120, height: 120 };
  return { width: 180, height: 60 };
}

function computeLayout(
  rawNodes: FlowNode[],
  rawEdges: FlowEdge[],
  direction: LayoutDirection
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of rawNodes) {
    const { width, height } = getNodeSize(node.type);
    g.setNode(node.id, { width, height });
  }

  for (const edge of rawEdges) {
    const weight = edge.label?.toLowerCase() === 'yes' ? 2 : 1;
    g.setEdge(edge.from, edge.to, { weight });
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of rawNodes) {
    const dagreNode = g.node(node.id);
    const { width, height } = getNodeSize(node.type);
    positions[node.id] = {
      x: dagreNode.x - width / 2,
      y: dagreNode.y - height / 2,
    };
  }

  return positions;
}

function buildConditionHandleMap(
  graph: FlowGraph,
  positions: Record<string, { x: number; y: number }>,
  direction: LayoutDirection
): Map<string, 'yes' | 'no'> {
  const map = new Map<string, 'yes' | 'no'>();
  // In TB branches spread horizontally → compare X; in LR they spread vertically → compare Y
  const axis = direction === 'LR' ? 'y' : 'x';

  for (const node of graph.nodes) {
    if (node.type !== 'condition') continue;
    const outEdges = graph.edges.filter(e => e.from === node.id);
    if (outEdges.length !== 2) continue;

    const [a, b] = outEdges;
    const aVal = positions[a.to]?.[axis] ?? 0;
    const bVal = positions[b.to]?.[axis] ?? 0;

    const firstEdge = aVal <= bVal ? a : b;   // smaller value
    const secondEdge = aVal <= bVal ? b : a;  // larger value
    if (direction === 'TB') {
      // TB: left branch (smaller x) → 'no' (Left handle), right branch (larger x) → 'yes' (Right handle)
      map.set(`${firstEdge.from}→${firstEdge.to}`, 'no');
      map.set(`${secondEdge.from}→${secondEdge.to}`, 'yes');
    } else {
      // LR: top branch (smaller y) → 'yes' (Top handle), bottom branch (larger y) → 'no' (Bottom handle)
      map.set(`${firstEdge.from}→${firstEdge.to}`, 'yes');
      map.set(`${secondEdge.from}→${secondEdge.to}`, 'no');
    }
  }

  return map;
}

function transformToReactFlow(
  graph: FlowGraph,
  direction: LayoutDirection
): { nodes: Node[]; edges: Edge[] } {
  const positions = computeLayout(graph.nodes, graph.edges, direction);
  const handleMap = buildConditionHandleMap(graph, positions, direction);

  const nodes: Node[] = graph.nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { label: node.label },
  }));

  const edges: Edge[] = graph.edges.map((edge, i) => {
    const sourceNode = graph.nodes.find(n => n.id === edge.from);
    let sourceHandle: string | undefined;
    if (sourceNode?.type === 'condition') {
      sourceHandle = handleMap.get(`${edge.from}→${edge.to}`);
    }
    return {
      id: `e${i}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      sourceHandle,
      type: 'animated',
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    };
  });

  return { nodes, edges };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof RateLimitError) return error.message;
  if (error instanceof Error) {
    const msg = error.message;
    if ('status' in (error as unknown as object)) {
      const status = (error as unknown as { status: number }).status;
      if (status === 429) return 'Rate limit reached. Please wait a moment and try again.';
      if (status >= 500) return 'AI service unavailable. Please try again later.';
    }
    if (msg.includes('Invalid JSON') || msg.includes('Unexpected')) {
      return 'Could not parse AI response. Try rephrasing your description.';
    }
    if (msg.includes('Invalid response structure') || msg.includes('Missing') || msg.includes('Edge references')) {
      return `${msg}. Try rephrasing.`;
    }
    return msg;
  }
  return 'Something went wrong. Please try again.';
}

export function useFlowGenerator() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<LayoutDirection>('TB');
  const [rawGraph, setRawGraph] = useState<FlowGraph | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [generationId, setGenerationId] = useState(0);

  const applyLayout = useCallback((graph: FlowGraph, dir: LayoutDirection) => {
    const { nodes: rfNodes, edges: rfEdges } = transformToReactFlow(graph, dir);
    setNodes(rfNodes);
    setEdges(rfEdges);
    setLayoutVersion(v => v + 1);
  }, [setNodes, setEdges]);

  const generate = useCallback(async (prompt: string) => {
    setLoading(true);
    try {
      const graph = await generateFlow(prompt);
      setRawGraph(graph);
      applyLayout(graph, direction);
      setGenerationId(id => id + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [direction, applyLayout]);

  const toggleDirection = useCallback(() => {
    const newDir = direction === 'TB' ? 'LR' : 'TB';
    setDirection(newDir);
    if (rawGraph) applyLayout(rawGraph, newDir);
  }, [direction, rawGraph, applyLayout]);

  const updateNodeLabel = useCallback((id: string, label: string) => {
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, label } } : n
    ));
  }, [setNodes]);

  const clear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setRawGraph(null);
  }, [setNodes, setEdges]);

  const restore = useCallback((savedNodes: Node[], savedEdges: Edge[], savedGraph?: FlowGraph) => {
    setNodes(savedNodes);
    setEdges(savedEdges);
    if (savedGraph) setRawGraph(savedGraph);
  }, [setNodes, setEdges]);

  const restoreFromGraph = useCallback((graph: FlowGraph) => {
    setRawGraph(graph);
    applyLayout(graph, direction);
  }, [applyLayout, direction]);

  return {
    nodes,
    edges,
    onNodesChange: onNodesChange as (changes: NodeChange[]) => void,
    onEdgesChange: onEdgesChange as (changes: EdgeChange[]) => void,
    loading,
    direction,
    rawGraph,
    layoutVersion,
    generationId,
    generate,
    toggleDirection,
    updateNodeLabel,
    clear,
    restore,
    restoreFromGraph,
  };
}
