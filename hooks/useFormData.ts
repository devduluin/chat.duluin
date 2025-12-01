import { useCallback, useState } from "react";
import { getForm } from "@services/v1/formService";
import { useLoadingStore } from '@/store/useLoadingStore';
import { useProgressTo80 } from '@/hooks/useProgressTo80';

export const useFormDetail = (id: string) => {
  const [formData, setFormData] = useState<any | null>(null);
  const clearFormData = useCallback(() => setFormData(null), []);
  const { loading, setLoading } = useLoadingStore();
  const [progress, setProgress] = useProgressTo80(loading);

  const fetchFormData = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    try {
      const res = await getForm(id);
      if (res.success) {
        setFormData(res.data);
      }
    } catch (err) {
        console.error("Failed to fetch form data", err);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [setFormData]);

  return {
    formData,
    fetchFormData,
    setFormData,
    clearFormData,
    loading,
    progress,
  };
};
