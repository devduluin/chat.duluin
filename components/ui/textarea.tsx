import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-h-[100px] px-4 py-3 border-b-2 border-transparent border-grey-400",
        "focus:border-blue-500 focus:bg-blue-50/30 focus:outline-none",
        "transition-all duration-200 ease-in-out",
        "placeholder:text-muted-foreground text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
