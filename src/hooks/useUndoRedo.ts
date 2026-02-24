import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

interface UndoRedoState<T> {
  past: T[];
  present: T | null;
  future: T[];
}

export function useUndoRedo<T>() {
  const stateRef = useRef<UndoRedoState<T>>({
    past: [],
    present: null,
    future: [],
  });

  // Incremented to trigger re-renders for canUndo/canRedo updates.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(n => n + 1), []);

  const push = useCallback((snapshot: T) => {
    const s = stateRef.current;
    // Don't push null present into past — skip it to avoid a no-op undo step.
    const newPast = s.present !== null
      ? [...s.past, s.present].slice(-MAX_HISTORY)
      : s.past;
    stateRef.current = { past: newPast, present: snapshot, future: [] };
    rerender();
  }, [rerender]);

  const undo = useCallback((): T | null => {
    const s = stateRef.current;
    if (s.past.length === 0) return null;
    const previous = s.past[s.past.length - 1];
    stateRef.current = {
      past: s.past.slice(0, -1),
      present: previous,
      future: s.present !== null ? [s.present, ...s.future] : s.future,
    };
    rerender();
    return previous;
  }, [rerender]);

  const redo = useCallback((): T | null => {
    const s = stateRef.current;
    if (s.future.length === 0) return null;
    const next = s.future[0];
    stateRef.current = {
      past: s.present !== null ? [...s.past, s.present] : s.past,
      present: next,
      future: s.future.slice(1),
    };
    rerender();
    return next;
  }, [rerender]);

  return {
    canUndo: stateRef.current.past.length > 0,
    canRedo: stateRef.current.future.length > 0,
    push,
    undo,
    redo,
  };
}
