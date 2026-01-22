"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 antialiased">
      {/* Sidebar Component */}
      <Sidebar
        expanded={sidebarExpanded}
        onClose={() => setSidebarExpanded(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
