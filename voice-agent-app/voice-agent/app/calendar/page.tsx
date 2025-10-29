"use client"

import { Suspense } from "react";
import Calendar31 from "@/components/calendar-31";

export default function CalendarPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-1 pb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your scheduled events.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        }>
          <Calendar31 />
        </Suspense>
      </div>
    </div>
  );
}
