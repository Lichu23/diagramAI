import { createContext, useContext } from 'react';

// Provides a stable callback that updates a node's label in the controlled state.
// Consumed by node components inside the ReactFlow tree.
export const NodeEditContext = createContext<(id: string, label: string) => void>(() => {});
export const useNodeEdit = () => useContext(NodeEditContext);

// Provides the current layout direction to node components.
export type LayoutDir = 'TB' | 'LR';
export const LayoutDirectionContext = createContext<LayoutDir>('LR');
export const useLayoutDirection = () => useContext(LayoutDirectionContext);
