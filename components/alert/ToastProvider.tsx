// ToastProvider.tsx
import { Toaster } from 'react-hot-toast';

const ToastProvider = () => (
  <Toaster
    position="bottom-center"
    toastOptions={{
      duration: 4000,
      className: 'text-xs',
      style: {
        padding: '10px 14px',
        fontWeight: 400,
        borderRadius: '8px',
      },
    }}
  />
);

export default ToastProvider;
