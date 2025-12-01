import { useState, useCallback } from 'react';
import { useProgressTo80 } from './useProgressTo80'; // adjust path as needed
import { getAllResponse } from '@/services/v1/responseService'; // adjust to your actual path
import { Metadata } from "@/lib/question"
import { showError } from '@utils/alertHelper';
import { useLoadingOverlayStore } from '@/store/useLoadingOverlayStore';
interface Filter {
    questionId: string;
    value: any;
}
export function useResponseList(formId: string, delay: number = 1000) {
  const [responses, setResponses] = useState<any[]>([]);
  const [metaData, setMetaData] = useState<Metadata>({
    total: 0,
    page: 1,
    pageSize: 0,
    totalPages: 0
  });
  // const { loading, setLoading } = useLoadingStore();
  
  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();
  const [progress, setProgress] = useProgressTo80(loadingOverlay);

  const fetchResponseList = useCallback(
    async (filters?: Filter[]) => {
    setLoadingOverlay(true);
    setProgress(0);

    try {
      const res = await getAllResponse(formId);
      const data = res?.data || [];
      const meta = res?.meta || {
        total: 0,
        page: 1,
        pageSize: 0,
        totalPages: 0
      };

      setResponses(data);
      setMetaData(meta);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error: any) {
      showError(`Error fetching questions: ${error?.message || error}`);
    } finally {
      setProgress(100);
      setLoadingOverlay(false);
    }
  }, [formId, setProgress]);

  return {
    responses,
    metaData,
    loadingOverlay,
    progress,
    setResponses,
    fetchResponseList,
    setMetaData
  };
}
