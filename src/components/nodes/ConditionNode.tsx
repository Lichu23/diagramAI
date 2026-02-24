import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { useInlineEdit, useHandles } from './nodeUtils';
import { useSimulationState } from '../SimulationContext';
import type { CSSProperties } from 'react';

type NodeData = { label: string };
type FlowNode = Node<NodeData>;

export default function ConditionNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { isLR } = useHandles();
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
      className="relative flex items-center justify-center select-none"
      style={{ width: 130, height: 130 }}
      onDoubleClick={startEditing}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        style={isLR ? { left: 2 } : { top: 2 }}
      />

      {/* Diamond shape */}
      <div
        className="absolute bg-white/5 backdrop-blur-md border border-yellow-500/30 flex items-center justify-center"
        style={{
          width: 92,
          height: 92,
          transform: 'rotate(45deg)',
          boxShadow: '0 0 15px rgba(234,179,8,0.3)',
          ...simStyle,
        }}
      >
        {editing ? (
          <input
            {...inputProps}
            className="bg-transparent text-yellow-200 text-xs font-semibold text-center focus:outline-none border-b border-yellow-200/40 min-w-0"
            style={{ transform: 'rotate(-45deg)', width: 60 }}
          />
        ) : (
          <div
            className="flex flex-col items-center gap-1"
            style={{ transform: 'rotate(-45deg)', maxWidth: 72 }}
          >
            <GitBranch size={10} className="text-yellow-400" />
            <span className="text-yellow-100 font-semibold text-xs text-center leading-tight block cursor-default">
              {data.label}
            </span>
          </div>
        )}
      </div>

      {/* Source handles — direction-aware */}
      {isLR ? (
        <>
          <Handle type="source" position={Position.Top} id="yes" style={{ top: 2 }} />
          <Handle type="source" position={Position.Bottom} id="no" style={{ bottom: 2 }} />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Left} id="no" style={{ left: 2 }} />
          <Handle type="source" position={Position.Right} id="yes" style={{ right: 2 }} />
        </>
      )}

      {/* Yes/No choice buttons — shown only when simulation is paused at this node */}
      {sim.status === 'paused' && sim.activeNodeId === id && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
          <div className="absolute inset-0 bg-gray-950/60 rounded" />
          <div className="relative flex gap-2 z-10">
            <button
              onClick={e => { e.stopPropagation(); sim.choose('no'); }}
              className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded shadow-lg transition-colors"
            >
              No
            </button>
            <button
              onClick={e => { e.stopPropagation(); sim.choose('yes'); }}
              className="px-3 py-1 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded shadow-lg transition-colors"
            >
              Yes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
