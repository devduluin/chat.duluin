'use client';

import React, { useState } from 'react';
import { useAccountStore } from '@/store/useAccountStore';
import Sidebar from '@/components/Sidebar';
import { Button } from "@/components/ui/button";
import Header from '@/components/Header';
import { Account } from '@/components/page/Account';
import { UserDropdown } from '@components/UserDropdown';
import { handleLogout } from '@hooks/useHandleLogout';
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { data, clearData} = useAccountStore();

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
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

  if(!data) return null;
  
  return (
    <>
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
          avatar: data.avatar
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

      <div className="flex min-h-[calc(100vh-64px)] bg-gray-100">
        {/* Sidebar */}
        <Sidebar expanded={sidebarExpanded} onClose={closeSidebar} />

        {/* Main content */}
        <div
          className={`
            flex-1 p-6 transition-all duration-300 ease-in-out
            w-full max-w-7xl mx-auto
            ${sidebarExpanded ? 'md:ml-64' : ''}
          `}
        >
          <Account data={data} />
          
        </div>
      </div>
    </>
  );
}