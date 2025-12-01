import Link from 'next/link';
import { FileText, Menu, X } from 'lucide-react';

interface HeaderProps {
  children: React.ReactNode;
  title?: string;
  sidebarMenu?: boolean;
  sidebarExpanded?: boolean;
  className?: string;
  onSidebarToggle?: () => void;
}

export default function Header({ children, title, sidebarMenu = false, sidebarExpanded, className='bg-white/80 border-b', onSidebarToggle }: HeaderProps) {
  return (
    <div className={`sticky top-0 z-[20] pb-4 pt-4 ${className}`}>
      <div className="flex px-6 justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle Button */}
          {sidebarMenu && (
          <button
            data-sidebar-toggle // Add this data attribute
            onClick={onSidebarToggle}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarExpanded ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
          )}

          {/* Logo */}
          <Link href="/forms" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <FileText className="h-7 w-7 text-white" />
            </div>
            {title ? (
              <h2 className="text-lg font-bold text-gray-800 hidden md:block">{title}</h2>
            ) : (
              <div className="text-left hidden md:block">
                <h1 className="text-md font-bold text-gray-800">Duluin Form</h1>
                <p className="text-gray-500 text-xs">Customize you forms</p>
              </div>
            )}
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {children}
        </div>
      </div>
    </div>
  );
}