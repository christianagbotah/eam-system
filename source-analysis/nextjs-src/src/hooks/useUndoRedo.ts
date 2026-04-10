// Undo/Redo Hook - Feature #17
'use client';
import { useState, useCallback } from 'react';

export const useUndoRedo = <T,>(initialState: T) => {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setPresent(previous);
    setFuture([present, ...future]);
  }, [past, present, future, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [past, present, future, canRedo]);

  const addState = useCallback((newState: T) => {
    setPast([...past, present]);
    setPresent(newState);
    setFuture([]);
  }, [past, present]);

  const reset = useCallback((newState: T) => {
    setPast([]);
    setPresent(newState);
    setFuture([]);
  }, []);

  return {
    state: present,
    setState: addState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset
  };
};
