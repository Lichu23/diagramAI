import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';
import type { FlowGraph } from '../services/groq';

const STORAGE_KEY = 'diagramai_flows';
const MAX_FLOWS = 20;

export interface SavedFlow {
  id: string;
  name?: string;
  prompt: string;
  graph?: FlowGraph;
  nodes: Node[];
  edges: Edge[];
  savedAt: number;
}

function readStorage(): SavedFlow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedFlow[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(flows: SavedFlow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
}

export function useFlowHistory() {
  const [flows, setFlows] = useState<SavedFlow[]>(readStorage);

  const save = useCallback((prompt: string, nodes: Node[], edges: Edge[], graph?: FlowGraph) => {
    const entry: SavedFlow = {
      id: Date.now().toString(),
      prompt,
      graph,
      nodes,
      edges,
      savedAt: Date.now(),
    };
    setFlows(prev => {
      const updated = [entry, ...prev].slice(0, MAX_FLOWS);
      writeStorage(updated);
      return updated;
    });
    toast.success('Flow saved!');
  }, []);

  const remove = useCallback((id: string) => {
    setFlows(prev => {
      const updated = prev.filter(f => f.id !== id);
      writeStorage(updated);
      return updated;
    });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setFlows(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, name: name.trim() || undefined } : f);
      writeStorage(updated);
      return updated;
    });
  }, []);

  return { flows, save, remove, rename };
}
