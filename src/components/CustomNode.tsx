import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useNodeEdit, useLayoutDirection } from './NodeEditContext';

type NodeData = { label: string };
type FlowNode = Node<NodeData>;

function useInlineEdit(id: string, currentLabel: string) {
  const updateLabel = useNodeEdit();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = (e: MouseEvent) => {
    e.stopPropagation();
    setDraft(currentLabel);
    setEditing(true);
  };

  const commit = () => {
    if (draft.trim()) updateLabel(id, draft.trim());
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') setEditing(false);
  };

  const inputProps = {
    value: draft,
    autoFocus: true,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown,
    onMouseDown: (e: MouseEvent) => e.stopPropagation(),
  };

  return { editing, startEditing, inputProps };
}

function useHandles() {
  const dir = useLayoutDirection();
  return {
    isLR: dir === 'LR',
    targetPos: dir === 'LR' ? Position.Left : Position.Top,
    sourcePos: dir === 'LR' ? Position.Right : Position.Bottom,
  };
}

export function StartNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { sourcePos } = useHandles();
  return (
    <div
      onDoubleClick={startEditing}
      className="px-6 py-2 rounded-full bg-green-500 text-white font-semibold text-sm shadow-md border-2 border-green-700 text-center cursor-default select-none"
    >
      {editing ? (
        <input
          {...inputProps}
          className="bg-transparent text-white text-sm font-semibold text-center w-full focus:outline-none border-b border-white/50 min-w-0"
        />
      ) : data.label}
      <Handle type="source" position={sourcePos} />
    </div>
  );
}

export function EndNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { targetPos } = useHandles();
  return (
    <div
      onDoubleClick={startEditing}
      className="px-6 py-2 rounded-full bg-red-500 text-white font-semibold text-sm shadow-md border-2 border-red-700 text-center cursor-default select-none"
    >
      <Handle type="target" position={targetPos} />
      {editing ? (
        <input
          {...inputProps}
          className="bg-transparent text-white text-sm font-semibold text-center w-full focus:outline-none border-b border-white/50 min-w-0"
        />
      ) : data.label}
    </div>
  );
}

export function ActionNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { targetPos, sourcePos } = useHandles();
  return (
    <div
      onDoubleClick={startEditing}
      className="px-4 py-3 rounded-md bg-blue-600 text-white font-medium text-sm shadow-md border-2 border-blue-800 min-w-36 text-center cursor-default select-none"
    >
      <Handle type="target" position={targetPos} />
      {editing ? (
        <input
          {...inputProps}
          className="bg-transparent text-white text-sm font-medium text-center w-full focus:outline-none border-b border-white/50 min-w-0"
        />
      ) : data.label}
      <Handle type="source" position={sourcePos} />
    </div>
  );
}

export function ConditionNode({ id, data }: NodeProps<FlowNode>) {
  const { editing, startEditing, inputProps } = useInlineEdit(id, data.label);
  const { isLR } = useHandles();
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 130, height: 130 }}
      onDoubleClick={startEditing}
    >
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        style={isLR ? { left: 2 } : { top: 2 }}
      />
      <div
        className="absolute bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center"
        style={{ width: 92, height: 92, transform: 'rotate(45deg)' }}
      >
        {editing ? (
          <input
            {...inputProps}
            className="bg-transparent text-gray-900 text-xs font-semibold text-center focus:outline-none border-b border-gray-900/40 min-w-0"
            style={{ transform: 'rotate(-45deg)', width: 60 }}
          />
        ) : (
          <span
            className="text-gray-900 font-semibold text-xs text-center leading-tight block cursor-default"
            style={{ transform: 'rotate(-45deg)', maxWidth: 72 }}
          >
            {data.label}
          </span>
        )}
      </div>
      {isLR ? (
        <>
          <Handle type="source" position={Position.Right} id="yes" style={{ right: 2, top: '32%' }} />
          <Handle type="source" position={Position.Right} id="no" style={{ right: 2, top: '68%' }} />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" style={{ bottom: 2, left: '32%' }} />
          <Handle type="source" position={Position.Bottom} id="no" style={{ bottom: 2, left: '68%' }} />
        </>
      )}
    </div>
  );
}
