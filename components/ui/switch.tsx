"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-[20px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border-1 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-blue-100 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600",
        "data-[state=checked]:border-blue-200", // Added border when checked
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg",
          "ring-0 transition-transform duration-200 ease-in-out",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          "dark:bg-gray-100 data-[state=checked]:bg-blue-600",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }