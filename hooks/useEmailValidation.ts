import { useState } from "react";
import { checkFormAccess } from "@/services/v1/formAccessService";

interface UseEmailValidationProps {
  form: any;
  emailUser: string;
  setEmailUser: (email: string) => void;
}

export function useEmailValidation({
  form,
  emailUser,
  setEmailUser,
}: UseEmailValidationProps) {
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailUser(value);
    setIsValidEmail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };

  const handleBlur = () => {
    setIsValidEmail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailUser));
  };

  const shackingEmail = () => {
    setIsValidEmail(false);
    setShakeEmail(true);
    setTimeout(() => setShakeEmail(false), 500);
  };

  const checkIfEmailAllowed = async (email: string): Promise<boolean> => {
    // Replace with actual API call
    const result = await checkFormAccess(email, form.id ?? '');
    if(result.success) {
      return result.data?.email;
    }else{
      setNotFound(true)
      return false;
    }
  };

  return {
    isValidEmail,
    shakeEmail,
    notFound,
    setIsValidEmail,
    setNotFound,
    handleChange,
    handleBlur,
    shackingEmail,
    checkIfEmailAllowed,
  };
}
