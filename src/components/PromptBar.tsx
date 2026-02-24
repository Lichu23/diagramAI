import { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: 'User login',
    prompt:
      'A user enters their email and password. The system validates the credentials. If valid, the user is logged in and redirected to the dashboard. If invalid, an error message is shown and the user can retry.',
  },
  {
    label: 'Order processing',
    prompt:
      'A customer submits an order. The system checks if the item is in stock. If yes, the payment is processed and the order is shipped to the customer. If no, the customer is notified that the item is unavailable.',
  },
  {
    label: 'CI/CD pipeline',
    prompt:
      'A developer pushes code to the repository. The CI system runs automated tests. If the tests pass, the code is deployed to staging. If the tests fail, the developer is notified to fix the issue.',
  },
  {
    label: 'Bug report',
    prompt:
      'A user submits a bug report. A developer reviews it and checks if the bug can be reproduced. If yes, it is prioritized and fixed, then the fix is verified. If no, the report is closed as invalid.',
  },
  {
    label: 'User onboarding',
    prompt:
      'A new user signs up and verifies their email. The system prompts them to complete their profile. If the profile is complete, the user is taken to the dashboard. If not, a reminder is shown to finish setup.',
  },
  {
    label: 'Password reset',
    prompt:
      'A user requests a password reset. The system sends a reset link to their email. The user clicks the link and enters a new password. If the password meets the requirements, it is saved and the user is logged in. If not, the user is asked to try again.',
  },
];

interface PromptBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: (prompt: string) => void;
  loading: boolean;
  hasNodes: boolean;
}

export function PromptBar({
  prompt,
  onPromptChange,
  onGenerate,
  loading,
  hasNodes,
}: PromptBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea — expands as you type, caps at ~200px (~9 rows) then scrolls
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 200);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
  }, [prompt]);

  const handleGenerate = () => {
    if (prompt.trim()) onGenerate(prompt.trim());
  };

  return (
    /* Floating card — sizing/centering handled by parent in App.tsx */
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/60 px-4 py-3">
      {/* Preset chips — visible only when canvas is empty */}
      {!hasNodes && !loading && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s.label}
              onClick={() => { onPromptChange(s.prompt); onGenerate(s.prompt); }}
              className="px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-full transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={2}
          className="flex-1 bg-gray-800/80 text-white border border-gray-700/60 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500/70 focus:bg-gray-800 placeholder-gray-500 disabled:opacity-50 transition-colors"
          style={{ minHeight: '2.75rem' }}
          placeholder='Describe a process… e.g. "The customer places an order, stock is validated…"'
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          disabled={loading}
        />
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Send size={14} />
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <span className="text-xs text-gray-600">Ctrl+Enter</span>
        </div>
      </div>
    </div>
  );
}
