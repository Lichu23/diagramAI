import { useState } from 'react';
import { X, RotateCcw, Trash2, Pencil, Check } from 'lucide-react';
import type { SavedFlow } from '../hooks/useFlowHistory';

interface FlowHistoryProps {
  flows: SavedFlow[];
  onLoad: (flow: SavedFlow) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function FlowItem({
  flow,
  onLoad,
  onDelete,
  onRename,
}: {
  flow: SavedFlow;
  onLoad: (flow: SavedFlow) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = () => {
    setDraft(flow.name ?? '');
    setEditing(true);
  };

  const commit = () => {
    onRename(flow.id, draft);
    setEditing(false);
  };

  return (
    <div className="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/40 transition-colors group">
      {editing ? (
        <div className="flex items-center gap-1 mb-1">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder={flow.prompt.slice(0, 40)}
            className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-0.5 border border-gray-600 focus:outline-none focus:border-blue-500 min-w-0"
          />
          <button onClick={commit} className="text-blue-400 hover:text-blue-300 shrink-0">
            <Check size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-1">
          <p className="text-xs text-white leading-snug line-clamp-2 flex-1">
            {flow.name ? (
              <><span className="font-medium">{flow.name}</span><span className="text-gray-500 ml-1">— {flow.prompt.slice(0, 40)}{flow.prompt.length > 40 ? '…' : ''}</span></>
            ) : flow.prompt}
          </p>
          <button
            onClick={startEditing}
            className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
          >
            <Pencil size={11} />
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1">{formatDate(flow.savedAt)}</p>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onLoad(flow)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded transition-colors"
        >
          <RotateCcw size={10} />
          Load
        </button>
        <button
          onClick={() => onDelete(flow.id)}
          className="ml-auto text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function FlowHistory({ flows, onLoad, onDelete, onRename, onClose }: FlowHistoryProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-72 bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-white">Saved Flows</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {flows.length === 0 ? (
          <p className="text-gray-500 text-sm p-6 text-center">
            No saved flows yet. Generate a diagram and click Save.
          </p>
        ) : (
          flows.map(flow => (
            <FlowItem
              key={flow.id}
              flow={flow}
              onLoad={onLoad}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))
        )}
      </div>
    </div>
  );
}
