import { Handle, type NodeProps, type Node } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { useInlineEdit, useHandles } from './nodeUtils';
import { useSimulationState } from '../SimulationContext';
import type { CSSProperties } from 'react';

type NodeData = { label: string };
type FlowNode = Node<NodeData>;

export default function ActionNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { targetPos, sourcePos } = useHandles();
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
      className="px-4 py-3 rounded-lg bg-white/5 backdrop-blur-md border border-blue-500/20 hover:border-blue-500/50 text-white font-medium text-sm cursor-default select-none min-w-36 flex items-center gap-2 transition-all"
      style={{ boxShadow: '0 0 15px rgba(59,130,246,0.25)', ...simStyle }}
    >
      <Handle type="target" position={targetPos} />
      <Zap size={12} className="text-blue-400 shrink-0" />
      {editing ? (
        <input
          {...inputProps}
          className="bg-transparent text-white text-sm font-medium text-center w-full focus:outline-none border-b border-white/50 min-w-0"
        />
      ) : (
        <span className="flex-1 text-center">{data.label}</span>
      )}
      <Handle type="source" position={sourcePos} />
    </div>
  );
}
