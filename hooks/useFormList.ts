import { useCallback, useState } from "react";
import { getForms } from "@services/v1/formService";
import { useLoadingOverlayStore } from '@/store/useLoadingOverlayStore';

export const useFormList = (userId: string, filter?: any) => {
  const [formList, setList] = useState<any[]>([]);
  const clearData = useCallback(() => setList([]), []);
  
  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();

  const fetchFormList = useCallback(async () => {
    if(userId === "") return;
    setLoadingOverlay(true);
    try {
      const res = await getForms(userId, filter);
      if (res.success) {
        setList(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch form data", err);
      throw err;
    } finally {
      setLoadingOverlay(false);
    }
  }, [userId, setLoadingOverlay]);

  return {
    formList,
    fetchFormList,
    clearData,
    loadingOverlay,
  };
};
