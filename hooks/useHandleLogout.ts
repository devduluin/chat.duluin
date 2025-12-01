// utils/auth.utils.ts
import { showError, showSuccess } from '@utils/alertHelper';

/**
 * Handles user logout flow
 */
export async function handleLogout({
  clearData,
  onSuccess,
  onError,
}: {
  clearData: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}): Promise<void> {
  try {
    document.cookie = 'app_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('account-store');
    // sessionStorage.removeItem('sessionData');

    // if ('serviceWorker' in navigator) {
    //   const registration = await navigator.serviceWorker.ready;
    //   registration.active?.postMessage({ type: 'LOGOUT' });
    // }

    clearData();
    showSuccess('Logged out successfully');
    onSuccess?.();
  } catch (error) {
    console.error('Logout failed:', error);
    showError('Logout failed. Please try again.');
    onError?.(error);
  }
}
