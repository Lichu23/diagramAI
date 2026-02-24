import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Position } from '@xyflow/react';
import { useNodeEdit, useLayoutDirection } from '../NodeEditContext';

export function useInlineEdit(id: string, currentLabel: string) {
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

export function useHandles() {
  const dir = useLayoutDirection();
  return {
    isLR: dir === 'LR',
    targetPos: dir === 'LR' ? Position.Left : Position.Top,
    sourcePos: dir === 'LR' ? Position.Right : Position.Bottom,
  };
}
