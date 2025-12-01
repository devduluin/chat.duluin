'use client';

import { useEffect, useState } from 'react';
import { getCookie, setCookie } from '@/utils/cookies';

export function useAppCookies() {
  const [appToken, setAppTokenState] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize cookies on mount
  useEffect(() => {
    setAppTokenState(getCookie('app_token'));
    
    const accountCookie = getCookie('account');
    try {
      setAccount(accountCookie ? JSON.parse(accountCookie) : null);
    } catch (e) {
      setAccount(null);
    }

    setCompanyId(getCookie('company_id'));
    setIsInitialized(true);
  }, []);

  // Create a wrapped setAppToken function that updates both state and cookie
  const setAppToken = (token: string | null) => {
    setAppTokenState(token);
    if (token) {
      setCookie('app_token', token, { path: '/' });
    } else {
      // If token is null, you might want to remove the cookie
      // You'll need a deleteCookie function for this (see note below)
      document.cookie = 'app_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  };

  return { appToken, account, companyId, isInitialized, setAppToken };
}
