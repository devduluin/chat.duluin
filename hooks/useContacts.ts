import { useCallback, useState } from "react";
import { getContacts } from "@/services/v1/contactService";
import { useLoadingOverlayStore } from '@/store/useLoadingOverlayStore';
import { useContactsStore } from "@/store/useContactStore";

export const useContactsList = (userId: string, filter?: any) => {
  const { contacts, setContacts } = useContactsStore();
  const clearData = useCallback(() => setContacts([]), []);
  
  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();

  const fetchContactsList = useCallback(async () => {
    if(userId === "") return;
    setLoadingOverlay(true);
    try {
      const res = await getContacts(userId, filter);
      if (res?.data) {
        setContacts(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch form data", err);
      throw err;
    } finally {
      setLoadingOverlay(false);
    }
  }, [userId, setLoadingOverlay]);

  return {
    contacts,
    fetchContactsList,
    setContacts,
    clearData,
    loadingOverlay,
  };
};
