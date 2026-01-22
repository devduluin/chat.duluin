import React, { Suspense  } from 'react';
import { Metadata } from 'next';
import IndexWorkspace from "@/components/IndexWorkspace";

export const metadata = {
  title: "Duluin Workspace",
  description: "Customize your need from scratch.",
};


export default function Page() {
  return (
      <IndexWorkspace />
  );
}