'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from "next/navigation";
import { createForm, createTemplateForm } from "@/services/v1/formService";
import { showError, showWarning, showSuccess } from '@utils/alertHelper';
import { useRouter } from 'next/navigation';
import LoadingOverlay from '@/utils/loadingOverlay';
import { useProgressTo80 } from '@/hooks/useProgressTo80';
import { Form } from "@/lib/form";
import { useAppCookies } from '@/hooks/useAppCookies';
import { useAccountStore } from '@/store/useAccountStore';
import { useAutoTokenValidation } from '@/hooks/useAutoTokenValidation';

export default function FormCreatePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useProgressTo80(isCreating);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();

  const template = searchParams.get("template");
  const isTemplateValid = template && template !== "null" && template !== "undefined";
  const companyId = id as string;

  const { appToken } = useAppCookies();
  const { data, setData, clearData } = useAccountStore();

  const { isValidating } = useAutoTokenValidation({
    appToken,
    data,
    companyId,
    setData,
    clearData,
  });

  const newForm: Form & { company_id: string } = {
    id: "",
    title: "Untitled Form",
    user_id: data?.id,
    company_id: companyId,
    description: "",
    status: "draft",
    time_out: 0,
  };

  const handleCreateForm = async () => {
    setIsCreating(true);
    setProgress(0);

    try {
      let createdData;

      if (isTemplateValid) {
        const response = await createTemplateForm({
          company_id: companyId,
          template: template,
        });
        createdData = response?.data;
      } else {
        const response = await createForm(newForm);
        createdData = response?.data;
      }

      if (createdData && createdData.id) {
        showSuccess("Form created successfully!");
        setProgress(100);

        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsCreating(false);
        await router.replace(`/forms/d/${createdData.id}`);
      } else {
        setIsCreating(false);
        showWarning("Failed to create form.");
      }

    } catch (error) {
      console.error('Error while creating form:', error);
      showError("An error occurred while creating the form.");
      setIsCreating(false);
    }
  };

  useEffect(() => {
    // if (!companyId) {
    //   showError("Missing company ID. Unable to create form.");
    //   router.replace("/");
    //   return;
    // }

    if (isValidating) {
      // Still validating token, wait
      return;
    }

    if (data?.companyId && companyId === data.companyId) {
      showSuccess("Start creating your form!");
      handleCreateForm();
    } else {
      showError("Invalid company or not authorized.");
      router.replace("/");
    }
  }, [companyId, router, isValidating, data, data?.companyId]);

  useEffect(() => {
    const warnIfCreating = () => {
      if (isCreating) {
        const confirmed = window.confirm(
          "Form is still being created. Are you sure you want to leave?"
        );
        if (!confirmed) {
          history.pushState(null, '', location.href);
          return false;
        }
      }
      return true;
    };

    const handlePopState = (e: PopStateEvent) => {
      if (!warnIfCreating()) {
        e.preventDefault();
      }
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      if (warnIfCreating()) {
        return originalReplaceState.apply(this, args);
      }
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.replaceState = originalReplaceState;
    };
  }, [isCreating]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {isCreating && (
          <LoadingOverlay
            title="Creating Your Form"
            isCreating={isCreating}
            progress={progress}
          />
        )}
      </div>
    </div>
  );
}
