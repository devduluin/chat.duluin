// toastHelper.ts
import { toast } from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message, {
    style: {
      background: '#2563eb', // blue-600
      color: 'white',
    },
    iconTheme: {
      primary: 'white',
      secondary: '#2563eb', // blue-600
    },
  });
};


export const showError = (message: string) => {
  toast.error(message, {
    style: {
      background: '#ef4444', // red-500
      color: 'white',
    },
    iconTheme: {
      primary: 'white',
      secondary: '#ef4444', // red-500
    },
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#3b82f6', // blue-500
      color: 'white',
    },
    iconTheme: {
      primary: 'white',
      secondary: '#3b82f6', // blue-500
    },
  });
};

export const showWarning = (message: string) => {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#f59e0b', // amber-500
      color: 'white',
    },
    iconTheme: {
      primary: 'white',
      secondary: '#f59e0b', // amber-500
    },
  });
};