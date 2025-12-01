// components/ui/EmptyState.tsx
import { MessageSquare } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: keyof typeof icons
}

const icons = {
  chat: MessageSquare,
  // Add more icons as needed
}

export function EmptyState({ title, description, icon = 'chat' }: EmptyStateProps) {
  const IconComponent = icons[icon]
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
        <IconComponent className="h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{description}</p>
    </div>
  )
}