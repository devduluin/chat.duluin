// components/ui/UserProfile.tsx
import { Avatar } from './avatar'
import { ChevronDown } from 'lucide-react'
import { Button } from './button'

export function UserProfile() {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar 
            src="https://randomuser.me/api/portraits/women/44.jpg" 
            name="Jane Doe" 
            size="sm"
          />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Jane Doe</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">jane@example.com</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}