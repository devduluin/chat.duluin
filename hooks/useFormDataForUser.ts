import { useCallback, useState } from "react";
import { getForm } from "@services/v2/formService";
import { useLoadingStore } from '@/store/useLoadingStore';
import { useProgressTo80 } from '@/hooks/useProgressTo80';

// Define the expected response type
interface FormResponse {
  success: boolean;
  data?: any; // Replace 'any' with your actual form data type if possible
  // Add other properties that might be in the response
}

export const useFormDetail = (id: string) => {
  const [formData, setFormData] = useState<any | null>(null);
  const clearFormData = useCallback(() => setFormData(null), []);
  const { loading, setLoading } = useLoadingStore();
  const [progress, setProgress] = useProgressTo80(loading);

  const fetchFormData = useCallback(async (): Promise<FormResponse | void> => {
    setLoading(true);
    setProgress(0);
    try {
      const res = await getForm(id);
      if (res.success) {
        setFormData(res.data);
      }
      return res; // Return the response so caller can check it
    } catch (err) {
      console.error("Failed to fetch form data", err);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [id, setLoading, setProgress]);

  return {
    formData,
    fetchFormData,
    setFormData,
    clearFormData,
    loading,
    progress,
  };
};