import React, { Suspense  } from 'react';
import { LoginForm } from "@/components/auth/LoginForm";
import Header from '@/components/HeaderWorkspace';

export const metadata = {
  title: "Workspace - Signin Account",
  description: "Customize your form from scratch.",
};


export default function Recent() {
  return (
    <>
      <Header className="bg-gray-200">
        <></>
      </Header>

      <div className="flex min-h-[calc(100vh-64px)] bg-gray-200 relative">
        {/* Main content */}
        <div
          className={`
            flex-1 p-6 transition-all duration-300 ease-in-out
            w-full max-w-6xl mx-auto`}>
              <Suspense fallback={<div></div>}>
                <LoginForm />
              </Suspense>
        </div>
      </div>
    </>
  );
}
