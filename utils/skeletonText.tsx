import React from "react";

interface SkeletonTextProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string; // Allow passing extra styles like width/height
}

const SkeletonText: React.FC<SkeletonTextProps> = ({ isLoading, children, className }) => {
  if (isLoading) {
    return (
      <span
        className={`inline-block animate-pulse bg-slate-200 rounded ${className ?? "w-24 h-4"}`}
      />
    );
  }

  return <>{children}</>;
};

export default SkeletonText;
