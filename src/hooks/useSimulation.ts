import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { SimulationStatus, SimulationState } from '../components/SimulationContext';

export function useSimulation(nodes: Node[], edges: Edge[]): SimulationState {
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [visitedNodeIds, setVisitedNodeIds] = useState<Set<string>>(new Set());
  const [visitedEdgeIds, setVisitedEdgeIds] = useState<Set<string>>(new Set());

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<(nodeId: string) => void>(() => {});
  const hasMountedRef = useRef(false);

  const { adjacencyMap, nodeTypeMap, startNodeId } = useMemo(() => {
    const adjacencyMap = new Map<string, Array<{ targetId: string; edgeId: string; branch?: 'yes' | 'no' }>>();
    const nodeTypeMap = new Map<string, string>();
    let startNodeId: string | null = null;

    for (const node of nodes) {
      nodeTypeMap.set(node.id, node.type ?? 'action');
      adjacencyMap.set(node.id, []);
      if (node.type === 'start') startNodeId = node.id;
    }

    for (const edge of edges) {
      if (!adjacencyMap.has(edge.source)) {
        adjacencyMap.set(edge.source, []);
      }
      // Use the visible edge label ("Yes"/"No") as the branch key — matches what the user sees.
      // sourceHandle is position-based and can be swapped in LR layout.
      const labelStr = typeof edge.label === 'string' ? edge.label.toLowerCase() : undefined;
      const branch =
        labelStr === 'yes' || labelStr === 'no' ? (labelStr as 'yes' | 'no') : undefined;
      adjacencyMap.get(edge.source)!.push({
        targetId: edge.target,
        edgeId: edge.id,
        branch,
      });
    }

    return { adjacencyMap, nodeTypeMap, startNodeId };
  }, [nodes, edges]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setActiveNodeId(null);
    setVisitedNodeIds(new Set());
    setVisitedEdgeIds(new Set());
  }, [clearTimer]);

  const advance = useCallback(
    (nodeId: string) => {
      const nodeType = nodeTypeMap.get(nodeId) ?? 'action';

      setActiveNodeId(nodeId);
      setVisitedNodeIds(prev => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });

      if (nodeType === 'end') {
        setStatus('complete');
        return;
      }

      if (nodeType === 'condition') {
        setStatus('paused');
        return;
      }

      // action or start: auto-advance after 800ms
      setStatus('running');
      const neighbors = adjacencyMap.get(nodeId) ?? [];
      if (neighbors.length === 0) {
        setStatus('complete');
        return;
      }

      const next = neighbors[0];
      setVisitedEdgeIds(prev => {
        const nextSet = new Set(prev);
        nextSet.add(next.edgeId);
        return nextSet;
      });

      timerRef.current = setTimeout(() => {
        advanceRef.current(next.targetId);
      }, 800);
    },
    [nodeTypeMap, adjacencyMap],
  );

  // Keep advanceRef in sync with the latest advance — avoids stale closures in setTimeout callbacks
  useEffect(() => {
    advanceRef.current = advance;
  });

  const start = useCallback(() => {
    clearTimer();
    setStatus('running');
    setActiveNodeId(null);
    setVisitedNodeIds(new Set());
    setVisitedEdgeIds(new Set());

    if (!startNodeId) return;

    timerRef.current = setTimeout(() => {
      advanceRef.current(startNodeId);
    }, 50);
  }, [clearTimer, startNodeId]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus('stopped');
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (activeNodeId === null) return;
    advanceRef.current(activeNodeId);
  }, [activeNodeId]);

  const choose = useCallback(
    (branch: 'yes' | 'no') => {
      if (status !== 'paused' || activeNodeId === null) return;

      const neighbors = adjacencyMap.get(activeNodeId) ?? [];
      const chosen = neighbors.find(n => n.branch === branch);
      if (!chosen) return;

      setStatus('running');
      setVisitedEdgeIds(prev => {
        const next = new Set(prev);
        next.add(chosen.edgeId);
        return next;
      });

      timerRef.current = setTimeout(() => {
        advanceRef.current(chosen.targetId);
      }, 50);
    },
    [status, activeNodeId, adjacencyMap],
  );

  // Auto-reset when the graph is regenerated, but not on initial mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    reset();
  }, [nodes, edges, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { status, activeNodeId, visitedNodeIds, visitedEdgeIds, start, pause, resume, choose, reset };
}
