import React, { Suspense } from "react";
import ConnectAccountPage from "@/components/auth/ConnectAccountPage";
import Header from "@/components/Header";

export const metadata = {
  title: "Workspace - Connect Account",
  description: "Customize your form from scratch.",
};

export default function Recent() {
  return (
    <>
      <Header className="bg-gray-300">
        <></>
      </Header>

      <div className="flex min-h-[calc(100vh-64px)] bg-gray-300 relative">
        {/* Main content */}
        <div
          className={`
            flex-1 p-6 transition-all duration-300 ease-in-out
            w-full max-w-6xl mx-auto`}
        >
          <Suspense fallback={<div></div>}>
            <ConnectAccountPage />
          </Suspense>
        </div>
      </div>
    </>
  );
}
