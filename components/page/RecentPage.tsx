"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { UserDropdown } from "@/components/UserDropdown";
import { handleLogout } from "@/hooks/useHandleLogout";
import { useRouter } from "next/navigation";
import { useAppCookies } from "@/hooks/useAppCookies";
import { useAccountStore } from "@/store/useAccountStore";
import { useAutoTokenValidation } from "@/hooks/useAutoTokenValidation";

export default function RecentPage() {
  const router = useRouter();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { appToken, companyId } = useAppCookies();
  const { data, setData, clearData } = useAccountStore();

  const { isValidating } = useAutoTokenValidation({
    appToken,
    data,
    companyId,
    setData,
    clearData,
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarExpanded(false);
  };

  const logout = async () => {
    await handleLogout({
      clearData,
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  if (!isValidating && !data) return null;

  return (
    <>
      {/* Header with mobile toggle button */}
      <Header
        sidebarMenu={true}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      >
        {data ? (
          <UserDropdown
            user={{
              name: data.name,
              email: data.email,
              avatar: data.avatar,
            }}
            onLogout={logout}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-6 py-2 rounded-md bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
          >
            Sign In
          </Button>
        )}
      </Header>

      <div className="flex min-h-[calc(100vh-64px)] bg-gray-100 relative">
        {/* Sidebar */}
        <Sidebar expanded={sidebarExpanded} onClose={closeSidebar} />

        {/* Main content */}
        <div
          className={`
            flex-1 p-6 transition-all duration-300 ease-in-out
            w-full max-w-7xl mx-auto
            ${sidebarExpanded ? "md:ml-64" : ""}
          `}
        >
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold">Recent Activity</h1>
            <p className="text-gray-500 mt-2">
              Your recent conversations will appear here
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
