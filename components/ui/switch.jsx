"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#474747] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#e7e7e7] data-[state=unchecked]:bg-[#3a3a3a]",
        className
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-[#161616] data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-[#e7e7e7]"
        )} />
    </SwitchPrimitive.Root>
  );
}

export { Switch }
