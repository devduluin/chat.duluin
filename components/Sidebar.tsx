'use client';

import React, { useEffect, useRef } from 'react';
import { FileText, LayoutTemplate, Trash2, Settings, User, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccountStore } from "@/store/useAccountStore";

interface SidebarProps {
  expanded: boolean;
  onClose: () => void;
}

export default function Sidebar({ expanded, onClose }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { data } = useAccountStore();

  const menuItems = [
    { 
      icon: <FileText className="h-5 w-5" />, 
      label: 'My Forms', 
      path: '/forms/i',
      badge: null
    },
    { 
      icon: <LayoutTemplate className="h-5 w-5" />, 
      label: 'Templates', 
      path: '/forms/t',
      badge: 'New'
    },
    // { 
    //   icon: <Trash2 className="h-5 w-5" />, 
    //   label: 'Trash', 
    //   path: '/forms/r',
    //   badge: null
    // },
    // { 
    //   icon: <Settings className="h-5 w-5" />, 
    //   label: 'Settings', 
    //   path: '/settings',
    //   badge: null
    // },
    { 
      icon: <User className="h-5 w-5" />, 
      label: 'Account', 
      path: '/forms/account',
      badge: null
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const toggleButton = document.querySelector('[data-sidebar-toggle]');
      if (
        expanded &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !toggleButton?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded, onClose]);

  return (
    <>
      {/* Glass morphism backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 md:top-19 left-0 h-full w-64 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200/70
          shadow-xl z-50 transform transition-all duration-300 ease-in-out
          ${expanded ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
         
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Create New button */}
          {/* <Link href={`/forms/c/${data?.companyId}`} className="w-full mb-6 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white
            flex items-center justify-center gap-2 text-sm font-medium shadow-md hover:shadow-lg transition-all
            hover:from-blue-600 hover:to-purple-600 active:scale-95">
            <Plus className="h-4 w-4" />
            Create New
          </Link> */}

          <ul className="space-y-0 mt-3">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.path;
              return (
                <li key={index}>
                  <Link
                    href={item.path}
                    className={`group flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${
                        isActive
                          ? 'bg-blue-50/80 text-blue-600 shadow-inner'
                          : 'text-gray-600 hover:bg-gray-100/70 hover:text-blue-500'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-1.5 rounded-lg ${
                        isActive 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100/50 group-hover:text-blue-500'
                      }`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${
                        isActive ? 'text-blue-500' : 'group-hover:text-blue-400'
                      }`} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        {/* <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">John Doe</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div> */}
      </aside>
    </>
  );
}