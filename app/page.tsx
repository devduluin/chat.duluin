// app/page.tsx
import { Sidebar } from '@/components/chat/Sidebar'
import { EmptyState } from '@/components/ui/emptyState'

export default function Home() {
  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <EmptyState 
          title="Select a conversation"
          description="Choose an existing chat or start a new one"
          icon="chat"
        />
      </div>
    </>
  )
}