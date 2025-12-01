import { useState, useCallback } from 'react';
import { useProgressTo80 } from './useProgressTo80'; // adjust path as needed
import { getQuestions } from '@/services/v1/questionService'; // adjust to your actual path
import { Metadata, Question } from "@/lib/question"
import { showError } from '@utils/alertHelper';
import { useLoadingOverlayStore } from '@/store/useLoadingOverlayStore';

export function useQuestionList(formId: string, delay: number = 1000) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metaData, setMetaData] = useState<Metadata>({
    total: 0,
    page: 1,
    pageSize: 0,
    totalPages: 0
  });
  // const { loading, setLoading } = useLoadingStore();
  
  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();
  const [progress, setProgress] = useProgressTo80(loadingOverlay);

  const fetchQuestionsList = useCallback(async () => {
    setLoadingOverlay(true);
    setProgress(0);

    try {
      const res = await getQuestions(formId);
      const data = res?.data || [];
      const meta = res?.meta || {
        total: 0,
        page: 1,
        pageSize: 0,
        totalPages: 0
      };

      setQuestions(data);
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
    questions,
    metaData,
    loadingOverlay,
    progress,
    setQuestions,
    fetchQuestionsList,
    setMetaData
  };
}
