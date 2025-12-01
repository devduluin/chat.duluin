import { useCallback, useState } from "react";
import { getFormAccess } from "@/services/v1/formAccessService";

export const useFormAccessList = (form_id: string) => {
  const [formAccessList, setFormAccessList] = useState<any[]>([]);
  const clear = useCallback(() => setFormAccessList([]), []);
  
  const [ loading, setLoading ] = useState<boolean>(false);

  const fetchFormAccessList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFormAccess(form_id);
      if (res.success) {
        setFormAccessList(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch form data", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [form_id, setLoading]);

  return {
    formAccessList,
    fetchFormAccessList,
    clear,
    loading,
  };
};
