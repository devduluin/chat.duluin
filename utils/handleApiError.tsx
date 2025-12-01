import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { handleLogout } from '@/utils/logout'; // 🔹 Import logout function
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const MySwal = withReactContent(Swal);

/**
 * Handles API error responses and shows a SweetAlert.
 *
 * @param error - The error object thrown by the API call.
 * @param successStatus - The expected successful status code (default: 200).
 * @param customMessage - Optional custom message to display in the alert.
 * @returns The original error object for further handling if needed.
 */
export async function handleApiError(
  error: any,
  successStatus: number = 200,
  customMessage?: string,
  router?: AppRouterInstance,
) {
  const status = error?.response?.status;

  if (status === 401 && status === 402) {
    //if (typeof window !== "undefined") {
      const result = await MySwal.fire({
        //title: 'Sesi Berakhir',
        text: 'Sesi Anda telah habis. Silakan login kembali.',
        //icon: 'warning',
        showCancelButton: false,
        confirmButtonText: 'Logout',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        //allowOutsideClick: false,
        //allowEscapeKey: false,
      });

      if (result.isConfirmed) {
        handleLogout(); // 🔹 Call logout only if user confirms
        return error;
      }
    }
  // 🔹 Show generic error alert if not 401
  // const message =
  //   error?.response?.data?.message ||
  //   error?.message ||
  //   customMessage ||
  //   'Something went wrong';

  // if (status !== successStatus) {
  //   MySwal.fire('Error', message, 'error');
  // }

  return error;
}
