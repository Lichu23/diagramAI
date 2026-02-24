import { Handle, type NodeProps, type Node } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useInlineEdit, useHandles } from './nodeUtils';
import { useSimulationState } from '../SimulationContext';
import type { CSSProperties } from 'react';

type NodeData = { label: string };
type FlowNode = Node<NodeData>;

export default function StartNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { sourcePos } = useHandles();
  const sim = useSimulationState();

  const isActive  = sim.activeNodeId === id;
  const isVisited = sim.visitedNodeIds.has(id) && !isActive;
  const isDimmed  = sim.status !== 'idle' && !isActive && !isVisited;

  const simStyle: CSSProperties = isActive
    ? { borderColor: 'rgb(6,182,212)', animation: 'sim-pulse 1s ease-in-out infinite' }
    : isVisited
    ? { borderColor: 'rgba(6,182,212,0.5)', boxShadow: '0 0 12px rgba(6,182,212,0.2)', opacity: 0.8 }
    : isDimmed
    ? { opacity: 0.3 }
    : {};

  return (
    <div
      onDoubleClick={startEditing}
      className="px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-green-500/30 text-white font-semibold text-sm cursor-default select-none flex items-center gap-2"
      style={{ boxShadow: '0 0 15px rgba(34,197,94,0.3)', ...simStyle }}
    >
      <Play size={12} className="text-green-400 shrink-0" />
      {editing ? (
        <input
          {...inputProps}
          className="bg-transparent text-white text-sm font-semibold text-center w-full focus:outline-none border-b border-white/50 min-w-0"
        />
      ) : (
        <span>{data.label}</span>
      )}
      <Handle type="source" position={sourcePos} />
    </div>
  );
}
