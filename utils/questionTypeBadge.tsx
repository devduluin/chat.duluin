'use client';

import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  open: 'Text',
  single: 'Single Choice',
  multiple: 'Multiple Choice',
  rating: 'Rating',
  nps: 'NPS',
  date: 'Date',
  file: 'File Upload',
  number: 'Number'
};

const typeColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  single: 'bg-purple-100 text-purple-800',
  multiple: 'bg-green-100 text-green-800',
  rating: 'bg-yellow-100 text-yellow-800',
  nps: 'bg-red-100 text-red-800',
  date: 'bg-gray-100 text-gray-800',
  file: 'bg-indigo-100 text-indigo-800',
  number: 'bg-pink-100 text-pink-800'
};

export function QuestionTypeBadge({ type,  }: { type: string }) {
  return (
    <Badge className={`text-xs ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}>
      {typeLabels[type] || type}
    </Badge>
  );
}