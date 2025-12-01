import { useState, useCallback, useEffect } from 'react';
import { useProgressTo80 } from './useProgressTo80';
import { getQuestions } from '@/services/v2/questionService';
import { Metadata, Question } from "@/lib/question";
import { showError } from '@utils/alertHelper';
import { useLoadingOverlayStore } from '@/store/useLoadingOverlayStore';

export function useQuestionList(formId: string, delay: number = 1000, page: number, isPrivate?: boolean) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metaData, setMetaData] = useState<Metadata>({
    total: 0,
    page: 1,
    pageSize: 0,
    totalPages: 0
  });

  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();
  const [progress, setProgress] = useProgressTo80(loadingOverlay);

  const fetchQuestionsList = useCallback(async () => {
    console.log("isPrivate", isPrivate);
    if(isPrivate) return;
    setLoadingOverlay(true);
    setProgress(0);

    try {
      const res = await getQuestions(formId, page);
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
  }, [formId, setProgress, page, delay, setLoadingOverlay, isPrivate]);

  // ✅ This effect triggers fetch when `page` changes
  useEffect(() => {
    fetchQuestionsList();
  }, [fetchQuestionsList]);

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
