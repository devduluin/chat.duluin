// app/not-found.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Rocket, Home, Compass, Ghost, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl text-center"
      >
        {/* Animated ghost illustration */}
        <motion.div
          animate={{
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <Ghost className="h-32 w-32 text-purple-500" strokeWidth={1} />
            <div className="absolute inset-0 bg-purple-100 rounded-full blur-xl opacity-30 -z-10" />
          </div>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-4">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Suggested actions */}
        <div className="grid grid-cols-1 items-center justify-center md:grid-cols-1 gap-4 mb-8">
          {[
            {
              icon: <Home className="h-5 w-5" />,
              text: "Return Home",
              href: "/",
              variant: "default"
            },
            // {
            //   icon: <Compass className="h-5 w-5" />,
            //   text: "Browse Content",
            //   href: "/explore",
            //   variant: "outline"
            // },
            // {
            //   icon: <RefreshCw className="h-5 w-5" />,
            //   text: "Try Again",
            //   onClick: () => window.location.reload(),
            //   variant: "ghost"
            // }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
            >
              {item.href ? (
                <Link href={item.href}>
                  <Button
                    variant={item.variant}
                    className={cn(
                      "w-full gap-2 py-5",
                      item.variant === 'default' && 
                      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    )}
                  >
                    {item.icon}
                    {item.text}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant={item.variant}
                  onClick={item.onClick}
                  className="w-full gap-2 py-5"
                >
                  {item.icon}
                  {item.text}
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Additional help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-500 mt-8"
        >
          <p className="mb-2">Still lost? Try searching or contact support</p>
          <Button variant="link" className="gap-2 text-blue-600">
            <Rocket className="h-4 w-4" />
            Get Help
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}