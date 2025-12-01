'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  title?: string;
  progress: number;
  isCreating?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ title, progress, isCreating }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messages = [
    "We're setting up your new form. This will just take a moment...",
    "Warming up the components...",
    "Writing form structure on the cloud...",
    "Fetching magical pixels...",
    "Almost there, brewing your form...",
    "Adding finishing touches..."
  ];

useEffect(() => {
    if (!isCreating) return;

    const messageInterval = setInterval(() => {
    setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(messageInterval);
}, [isCreating]);

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <p className="text-gray-500 text-center">{messages[currentMessageIndex]}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
