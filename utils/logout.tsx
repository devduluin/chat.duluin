// utils/logout.ts
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { logoutService } from '@/services/loginService';
import { useAccountStore } from '@/store/useAccountStore';
import { getCookie,deleteCookie } from '@/utils/cookies';

const MySwal = withReactContent(Swal);

export async function handleLogout() {
  const confirm = await MySwal.fire({
    html: '<h2>Are you sure you want to logout?</h2>',
    showCancelButton: true,
    confirmButtonColor: '#007BFF',
    confirmButtonText: 'Yes, sign out',
    cancelButtonText: 'Cancel',
  });

  if (!confirm.isConfirmed) return;

  const appToken = getCookie('app_token');
  if(appToken){
    try {
      await logoutService({ appToken });
    } catch (error: any) {
      // Optionally log the error
      console.error('Logout API failed:', error);
    } finally {
      useAccountStore.getState().clearData();
      deleteCookie('app_token');
      deleteCookie('company_id');
      localStorage.removeItem('account-store');
      window.location.href = '/';
    }
  }

  // await MySwal.fire({
  //   html: '<strong>Berhasil keluar</strong><p>Anda telah berhasil keluar.</p>',
  //   timer: 1500,
  //   showConfirmButton: false,
  //   didClose: () => {
  //     window.location.href = '/'
  //   }
  // });

}
