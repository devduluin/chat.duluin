'use client';

import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type BreadcrumbItem = {
  title: string;
  href?: string;
  icon?: React.ReactNode;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  backHref?: string;
  className?: string;
};

export const Breadcrumb = ({ items, backHref, className }: BreadcrumbProps) => {
  return (
    <div className={cn('relative w-full', className)}>
      <div className="flex justify-between items-center py-4 dark:bg-gray-900 rounded-lg">
        <nav className="flex items-center space-x-1 text-sm">
          {items.map((item, index) => (
            <div key={index} className="flex items-center">
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center px-2 py-1.5 rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.title}
                </Link>
              ) : (
                <span className="px-2 py-1.5 rounded-lg font-medium text-gray-800 dark:text-white">
                  {item.title}
                </span>
              )}
              {index < items.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400 dark:text-gray-500" />
              )}
            </div>
          ))}
        </nav>

        {backHref && (
          <Link href={backHref}>
            <Button
              variant="ghost"
              size="sm"
              className="ml-4 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};