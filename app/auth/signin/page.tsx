import React, { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In - Duluin Chat",
  description: "Sign in to your Duluin Chat account",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div></div>}>
      <LoginForm />
    </Suspense>
  );
}
