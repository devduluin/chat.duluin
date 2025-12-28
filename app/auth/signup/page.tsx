import React, { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Sign Up - Duluin Chat",
  description: "Create your Duluin Chat account",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
