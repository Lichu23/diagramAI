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

  // Sort so 'no' edges are added before 'yes' edges — dagre uses insertion
  // order within a rank, which nudges the no-branch to the left consistently.
  const sortedEdges = [...rawEdges].sort((a, b) => {
    const aLabel = a.label?.toLowerCase() ?? '';
    const bLabel = b.label?.toLowerCase() ?? '';
    if (aLabel === 'no' && bLabel === 'yes') return -1;
    if (aLabel === 'yes' && bLabel === 'no') return 1;
    return 0;
  });
  for (const edge of sortedEdges) {
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

  enforceYesOnRight({ nodes: rawNodes, edges: rawEdges }, positions, direction);

  return positions;
}

// Returns all node IDs reachable from startId without passing through excludeId.
// Nodes shared by both yes and no subtrees (convergence points) are excluded
// by the caller so they aren't moved by either branch.
function getSubtree(graph: FlowGraph, startId: string, excludeId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id) || id === excludeId) continue;
    visited.add(id);
    for (const edge of graph.edges) {
      if (edge.from === id) queue.push(edge.to);
    }
  }
  return visited;
}

// After dagre layout, ensure the yes-branch subtree is always to the right of
// the no-branch subtree (TB) or above it (LR) for every condition node.
// If dagre placed them on the wrong side, we translate both subtrees to swap them.
function enforceYesOnRight(
  graph: FlowGraph,
  positions: Record<string, { x: number; y: number }>,
  direction: LayoutDirection,
): void {
  for (const node of graph.nodes) {
    if (node.type !== 'condition') continue;

    const outEdges = graph.edges.filter(e => e.from === node.id);
    const yesEdge = outEdges.find(e => e.label?.toLowerCase() === 'yes');
    const noEdge  = outEdges.find(e => e.label?.toLowerCase() === 'no');
    if (!yesEdge || !noEdge) continue;

    const yesRoot = positions[yesEdge.to];
    const noRoot  = positions[noEdge.to];
    if (!yesRoot || !noRoot) continue;

    const axis = direction === 'TB' ? 'x' : 'y';
    // TB: yes should have larger x (right). LR: yes should have smaller y (top).
    const yesIsCorrect = direction === 'TB'
      ? yesRoot.x >= noRoot.x
      : yesRoot.y <= noRoot.y;
    if (yesIsCorrect) continue;

    const yesSubtree = getSubtree(graph, yesEdge.to, node.id);
    const noSubtree  = getSubtree(graph, noEdge.to,  node.id);

    // Don't move nodes where both branches converge.
    for (const id of yesSubtree) { if (noSubtree.has(id)) { yesSubtree.delete(id); noSubtree.delete(id); } }

    const delta = noRoot[axis] - yesRoot[axis];
    for (const id of yesSubtree) {
      positions[id] = { ...positions[id], [axis]: positions[id][axis] + delta };
    }
    for (const id of noSubtree) {
      positions[id] = { ...positions[id], [axis]: positions[id][axis] - delta };
    }
  }
}

// Maps each condition edge to its handle using the edge label directly.
// 'yes' → yes handle (Right in TB, Top in LR)
// 'no'  → no handle  (Left in TB, Bottom in LR)
function buildConditionHandleMap(graph: FlowGraph): Map<string, 'yes' | 'no'> {
  const map = new Map<string, 'yes' | 'no'>();
  for (const edge of graph.edges) {
    const label = edge.label?.toLowerCase();
    if (label === 'yes' || label === 'no') {
      map.set(`${edge.from}→${edge.to}`, label);
    }
  }
  return map;
}

function transformToReactFlow(
  graph: FlowGraph,
  direction: LayoutDirection
): { nodes: Node[]; edges: Edge[] } {
  const positions = computeLayout(graph.nodes, graph.edges, direction);
  const handleMap = buildConditionHandleMap(graph);

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
  const [direction, setDirection] = useState<LayoutDirection>('LR');
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
