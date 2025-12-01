import { useCallback, useState } from "react";
import { getOneResponse } from "@services/v1/responseService";
import { useLoadingStore } from '@/store/useLoadingStore';
import { useLoadingOverlayStore } from '@/store/useLoadingOverlayStore';
import { useProgressTo80 } from './useProgressTo80';

export const useResponseDetail = (formId: string, responseId: string) => {
  const [responseData, setResponseData] = useState<any | null>(null);
  const clearResponseData = useCallback(() => setResponseData(null), []);


  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();
  const [progress, setProgress] = useProgressTo80(loadingOverlay);

  const fetchResponseData = useCallback(async () => {
    setLoadingOverlay(true);
    setProgress(0);
    try {
      const res = await getOneResponse(formId, responseId);
      if (res.success) {
        setResponseData(res.data);
      }
    } catch (err) {
        console.error("Failed to fetch Response data", err);
    } finally {
      setProgress(100);
      setLoadingOverlay(false);
    }
  }, [setResponseData, formId, responseId, setProgress]);

  return {
    responseData,
    fetchResponseData,
    setResponseData,
    clearResponseData,
    loadingOverlay,
    progress,
  };
};
