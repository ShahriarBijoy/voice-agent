"use client"

import * as React from "react"
import { formatDateRange } from "little-date"
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, CalendarIcon, MapPinIcon, ClockIcon, AlignLeftIcon } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AddEventDialog } from "@/components/add-event-dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

// Define the event type based on your API response
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
}

async function fetchEvents(date: Date): Promise<CalendarEvent[]> {
  const dateString = date.toISOString().split('T')[0];
  const response = await fetch(`/api/calendar?date=${dateString}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

async function addEvent(eventData: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  const response = await fetch('/api/calendar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...eventData, participants: ["user@example.com"] }), // Add default participants
  });
  if (!response.ok) {
    throw new Error('Failed to add event');
  }
  return response.json();
}


export default function Calendar31() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(null)
  const queryClient = useQueryClient()
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const handleEventClick = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['events', date?.toISOString().split('T')[0]],
    queryFn: () => date ? fetchEvents(date) : Promise.resolve([]),
    enabled: !!date,
  });
  
  const addEventMutation = useMutation({
    mutationFn: addEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event added successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to add event: ${error.message}`);
    }
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6 h-full">
        {/* Calendar Section */}
        <Card className="flex flex-col max-h-[60vh]">
          <CardContent className="p-6">
            {isClient ? (
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                onMonthChange={setDate}
                className="bg-transparent p-0 w-full [&_table]:w-full [&_td]:h-12 [&_td]:w-12 [&_th]:h-10 [&_th]:text-base [&_button]:h-12 [&_button]:w-12 [&_button]:text-base"
                required
              />
            ) : (
              <div className="w-full h-[400px]" />
            )}
          </CardContent>
        </Card>

        {/* Events List Section */}
        <Card className="flex flex-col max-h-[60vh] overflow-hidden">
          <CardHeader className="pb-4 flex-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {date?.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Event
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <ScrollArea className="flex-1 min-h-0">
            <div>
              {isLoading && (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Loading events...
                </div>
              )}
              {!isLoading && events.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
                  <p>No events for this day.</p>
                </div>
              )}
              {!isLoading && events.map((event) => {
                const isExpanded = expandedEventId === event.id
                const startDate = new Date(event.startTime)
                const endDate = new Date(event.endTime)

                return (
                  <div key={event.id} className="border-b last:border-b-0">
                    <div
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleEventClick(event.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleEventClick(event.id)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-1 h-full min-h-[3rem] bg-primary rounded-full mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm mb-1">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(startDate)} - {formatTime(endDate)}
                            </div>
                            {event.location && !isExpanded && (
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                📍 {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventClick(event.id)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-muted/30 space-y-3">
                        <Separator className="mb-3" />
                        
                        {/* Time Details */}
                        <div className="flex items-start gap-3">
                          <ClockIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1 text-sm">
                            <div className="font-medium">Time</div>
                            <div className="text-muted-foreground">
                              {formatDateRange(startDate, endDate)}
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        {event.location && (
                          <div className="flex items-start gap-3">
                            <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 text-sm">
                              <div className="font-medium">Location</div>
                              <div className="text-muted-foreground">
                                {event.location}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {event.description && (
                          <div className="flex items-start gap-3">
                            <AlignLeftIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 text-sm">
                              <div className="font-medium">Description</div>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {event.description}
                              </div>
                            </div>
                          </div>
                        )}

                        <Separator className="my-3" />

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit Event
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1">
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
      
      <AddEventDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onEventAdd={(data) => addEventMutation.mutate(data)}
        defaultDate={date}
      />
    </>
  )
}
