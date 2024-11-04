"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("border rounded-md p-2", className)}
      {...props}
    />
  )
)

Input.displayName = "Input"

export { Input }
