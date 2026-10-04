import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

let listeners: Array<(toasts: ToastMessage[]) => void> = [];
let memoryToasts: ToastMessage[] = [];

export function showToast(type: 'success' | 'error' | 'info', title: string, description?: string) {
  const id = Math.random().toString(36).substring(2, 9);
  const toast: ToastMessage = { id, type, title, description };
  memoryToasts = [...memoryToasts, toast];
  listeners.forEach((listener) => listener(memoryToasts));

  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(memoryToasts));
  }, 4000);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>(memoryToasts);

  const subscribe = useCallback((newListener: (toasts: ToastMessage[]) => void) => {
    listeners.push(newListener);
    return () => {
      listeners = listeners.filter((l) => l !== newListener);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(memoryToasts));
    setToasts(memoryToasts);
  }, []);

  return {
    toasts,
    subscribe,
    removeToast,
    toast: showToast,
    success: (title: string, description?: string) => showToast('success', title, description),
    error: (title: string, description?: string) => showToast('error', title, description),
    info: (title: string, description?: string) => showToast('info', title, description),
  };
}
