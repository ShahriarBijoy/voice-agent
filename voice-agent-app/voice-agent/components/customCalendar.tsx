"use client"

import { useState } from "react"

import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function Component() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div className="flex flex-col min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="bg-transparent p-0 w-full [&_table]:w-full [&_td]:h-12 [&_td]:w-12 [&_th]:h-10 [&_th]:text-base [&_button]:h-12 [&_button]:w-12 [&_button]:text-base"
          classNames={{
            day_button: "rounded-full",
          }}
          required
        />
      </ScrollArea>
      <p
        className="mt-4 text-center text-xs text-muted-foreground"
        role="region"
        aria-live="polite"
      >
        Custom select day style -{" "}
        <a
          className="underline hover:text-foreground"
          href="https://daypicker.dev/"
          target="_blank"
          rel="noopener nofollow"
        >
          React DayPicker
        </a>
      </p>
    </div>
  )
}
