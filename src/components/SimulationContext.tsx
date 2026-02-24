import { createContext, useContext } from 'react';

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'complete';

export interface SimulationState {
  status: SimulationStatus;
  activeNodeId: string | null;
  visitedNodeIds: Set<string>;
  visitedEdgeIds: Set<string>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  choose: (branch: 'yes' | 'no') => void;
  reset: () => void;
}

const defaultIdleState: SimulationState = {
  status: 'idle',
  activeNodeId: null,
  visitedNodeIds: new Set(),
  visitedEdgeIds: new Set(),
  start: () => {},
  pause: () => {},
  resume: () => {},
  choose: () => {},
  reset: () => {},
};

export const SimulationContext = createContext<SimulationState>(defaultIdleState);
export const useSimulationState = () => useContext(SimulationContext);
