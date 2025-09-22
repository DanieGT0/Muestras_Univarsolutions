import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

let toastCounter = 0;

// Simple toast implementation - can be replaced with a more sophisticated one later
export const toast = ({ title, description, variant = 'default', duration = 5000 }: Omit<Toast, 'id'>) => {
  const id = `toast-${++toastCounter}`;

  // Create a simple notification element
  const toastElement = document.createElement('div');
  toastElement.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
    variant === 'destructive'
      ? 'bg-red-500 text-white'
      : 'bg-green-500 text-white'
  }`;

  toastElement.innerHTML = `
    <div class="font-medium">${title}</div>
    ${description ? `<div class="text-sm opacity-90 mt-1">${description}</div>` : ''}
  `;

  document.body.appendChild(toastElement);

  // Remove after duration
  setTimeout(() => {
    if (toastElement.parentNode) {
      toastElement.remove();
    }
  }, duration);

  return id;
};

export const useToast = () => {
  return { toast };
};