import { type KeyboardEvent } from 'react';

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

interface FlowEditorProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: (prompt: string) => void;
  loading: boolean;
}

export function FlowEditor({ prompt, onPromptChange, onGenerate, loading }: FlowEditorProps) {
  const handleGenerate = () => {
    if (prompt.trim()) onGenerate(prompt.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 border-b border-gray-800">
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s.label}
              onClick={() => { onPromptChange(s.prompt); onGenerate(s.prompt); }}
              className="px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-full transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500 placeholder-gray-500 disabled:opacity-50"
        rows={3}
        placeholder='Describe a process... e.g. "The customer places an order, stock is validated, if available the order is confirmed and shipped, if not the customer is notified"'
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Ctrl+Enter to generate</span>
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Diagram'}
        </button>
      </div>
    </div>
  );
}
