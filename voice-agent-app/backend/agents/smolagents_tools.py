"""
Smolagents-compatible tool wrappers for existing tools.
These tools use a sync interface but handle async calls internally.
"""
from typing import Any, Dict, Optional, List
from datetime import datetime
from zoneinfo import ZoneInfo
import asyncio
import concurrent.futures

from smolagents import Tool
from api.calendar import (
    get_calendar_events, 
    create_calendar_event, 
    update_calendar_event,
    delete_calendar_event,
    CalendarEventCreate,
    CalendarEventUpdate,
    DEMO_CALENDAR_DATA
)


def _run_async(coro):
    """Helper to run async code from sync context"""
    try:
        loop = asyncio.get_running_loop()
        # Event loop is running in current thread, need to run in a separate thread
        # with its own event loop
        def run_in_thread():
            # Create a new event loop in this thread (threads don't share event loops)
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(coro)
            finally:
                new_loop.close()
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            return future.result()
    except RuntimeError:
        # No event loop running, create a new one
        return asyncio.run(coro)


class SmolCalendarTool(Tool):
    """
    A tool to check the user's calendar for a given date.
    Compatible with smolagents Tool interface.
    """
    name = "check_calendar"
    filler_message = "Let me check your calendar for you..."
    description = "Checks the calendar for events on a specified date. If no date is given, it checks for today. When the user asks about 'today' or 'tomorrow', calculate the date in Central European Time. This tool returns FULL event details including title, time, location, and description."
    inputs = {
        "date": {
            "type": "string",
            "description": "The date to check for events, in YYYY-MM-DD format. If not provided, checks today's date.",
            "nullable": True
        }
    }
    output_type = "string"
    
    def __init__(self):
        super().__init__()
        self.conversation_context: Optional[Dict[str, Any]] = None
    
    def set_context(self, context: Optional[Dict[str, Any]]):
        """Set conversation context for this tool."""
        self.conversation_context = context
    
    def forward(self, date: Optional[str] = None) -> str:
        """
        Check calendar for events on the specified date.
        
        Args:
            date: The date to check for events, in YYYY-MM-DD format. If None, checks today.
        
        Returns:
            A formatted string describing the events found.
        """
        if not date:
            # Use Central European Time for current date
            cet_tz = ZoneInfo("Europe/Berlin")
            date = datetime.now(cet_tz).strftime("%Y-%m-%d")
        
        try:
            events = _run_async(get_calendar_events(date=date))

            if not events:
                return f"You have no events scheduled for {date}."

            event_summaries = []
            for event in events:
                start_time = event.startTime.strftime('%I:%M %p').lstrip('0')
                end_time = event.endTime.strftime('%I:%M %p').lstrip('0')
                
                # Build detailed event summary including location
                event_detail = f"- '{event.title}' from {start_time} to {end_time}"
                
                if event.location:
                    event_detail += f" at {event.location}"
                    
                if event.description:
                    event_detail += f" (Note: {event.description})"
                    
                event_summaries.append(event_detail)

            result = f"On {date}, you have the following events:\n" + "\n".join(event_summaries)
            
            return result

        except Exception as e:
            print(f"An unexpected error occurred while checking calendar: {e}")
            import traceback
            traceback.print_exc()
            return "Sorry, an unexpected error occurred while checking your calendar."


class SmolBookAppointmentTool(Tool):
    """
    A tool to book an appointment in the user's calendar.
    Compatible with smolagents Tool interface.
    """
    name = "book_appointment"
    filler_message = "Sure, let me get that on your schedule."
    description = """Books a new appointment or event in the calendar.

    ⚠️ CRITICAL RULES - READ CAREFULLY:
    
    1. ONLY call this tool ONCE per user request
    2. ONLY call after user explicitly says "yes", "correct", "go ahead"
    3. You MUST have ALL information before calling:
       - title (required)
       - startTime in ISO format: YYYY-MM-DDTHH:MM:SS (required)
       - endTime in ISO format: YYYY-MM-DDTHH:MM:SS (required)
       - location (required - ASK if not provided)
    
    4. NEVER call this tool to "update" or "correct" - that creates duplicates
    5. If user wants changes, use update_event tool instead
    
    Date/Time Conversion Examples:
    - "tomorrow at 6 AM" → "2025-11-01T06:00:00"
    - "November 1st at 6 AM to 9 AM" → start: "2025-11-01T06:00:00", end: "2025-11-01T09:00:00"
    
    NEVER assume default values. Ask user for missing information."""
    inputs = {
        "title": {
            "type": "string",
            "description": "The title/name of the appointment or event."
        },
        "startTime": {
            "type": "string",
            "description": "The start date and time in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-10-30T15:00:00' for October 30, 2025 at 3 PM). You must convert relative dates like 'tomorrow' to absolute dates."
        },
        "endTime": {
            "type": "string",
            "description": "The end date and time in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-10-30T16:00:00' for October 30, 2025 at 4 PM). You must convert relative dates like 'tomorrow' to absolute dates."
        },
        "description": {
            "type": "string",
            "description": "Optional brief description of what the appointment is about.",
            "nullable": True
        },
        "location": {
            "type": "string",
            "description": "Optional location where the appointment will take place (e.g., 'University of Bremen', 'Virtual/Zoom', 'Conference Room 4B').",
            "nullable": True
        },
        "participants": {
            "type": "array",
            "description": "Optional list of participant email addresses.",
            "nullable": True,
            "items": {
                "type": "string"
            }
        }
    }
    output_type = "string"
    
    def __init__(self):
        super().__init__()
        self.conversation_context: Optional[Dict[str, Any]] = None
    
    def set_context(self, context: Optional[Dict[str, Any]]):
        """Set conversation context for this tool."""
        self.conversation_context = context
    
    def forward(
        self,
        title: str,
        startTime: str,
        endTime: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        participants: Optional[List[str]] = None,
    ) -> str:
        """
        Book an appointment in the calendar.
        
        Args:
            title: The title/name of the appointment or event.
            startTime: The start date and time in ISO 8601 format: YYYY-MM-DDTHH:MM:SS
            endTime: The end date and time in ISO 8601 format: YYYY-MM-DDTHH:MM:SS
            description: Optional brief description of what the appointment is about.
            location: Optional location where the appointment will take place.
            participants: Optional list of participant email addresses.
        
        Returns:
            A confirmation message about the booked appointment.
        """
        try:
            # Add a default participant if none are provided
            if not participants:
                participants = ["user@example.com"]

            # Parse datetime strings - ensure they're in CET timezone
            start_dt = datetime.fromisoformat(startTime)
            end_dt = datetime.fromisoformat(endTime)
            
            # If timezone-naive, assume CET
            cet_tz = ZoneInfo("Europe/Berlin")
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=cet_tz)
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=cet_tz)

            event_data = CalendarEventCreate(
                title=title,
                startTime=start_dt,
                endTime=end_dt,
                description=description,
                location=location,
                participants=participants
            )
            
            created_event = _run_async(create_calendar_event(event_data))
            
            start_time_str = created_event.startTime.strftime('%I:%M %p').lstrip('0')
            end_time_str = created_event.endTime.strftime('%I:%M %p').lstrip('0')
            date_str = created_event.startTime.strftime('%B %d, %Y')
            
            # Build detailed confirmation message
            confirmation = f"Successfully booked '{created_event.title}' on {date_str} from {start_time_str} to {end_time_str}"
            
            if created_event.location:
                confirmation += f" at {created_event.location}"
            
            confirmation += "."
            
            return confirmation

        except Exception as e:
            print(f"Error booking appointment: {e}")
            import traceback
            traceback.print_exc()
            return f"Sorry, I encountered an error while trying to book the appointment: {str(e)}"


class SmolDeleteDuplicatesTool(Tool):
    """Tool to delete duplicate or unwanted events."""
    name = "delete_duplicates"
    description = """Deletes duplicate events from the calendar, keeping only one.
    
    Use this when:
    - User says "remove duplicates" or "delete duplicates"
    - User wants to keep only one event when multiple exist
    
    This will find duplicate events for a given date/title and keep only the most recent one."""
    inputs = {
        "date": {
            "type": "string",
            "description": "Date to check for duplicates in YYYY-MM-DD format"
        },
        "title_filter": {
            "type": "string",
            "description": "Optional title to filter events (e.g., 'Testing Running')",
            "nullable": True
        }
    }
    output_type = "string"
    
    def forward(self, date: str, title_filter: Optional[str] = None) -> str:
        """Delete duplicate events."""
        try:
            # Get all events for the date
            events = _run_async(get_calendar_events(date=date))
            
            if not events:
                return f"No events found on {date}."
            
            # Filter by title if provided
            if title_filter:
                matching_events = [
                    e for e in events 
                    if title_filter.lower() in e.title.lower()
                ]
            else:
                matching_events = events
            
            if len(matching_events) <= 1:
                return "No duplicates found."
            
            # Keep the last one (most recently created), delete others
            events_to_delete = matching_events[:-1]
            
            deleted_count = 0
            for event in events_to_delete:
                try:
                    _run_async(delete_calendar_event(event.id))
                    deleted_count += 1
                except Exception as e:
                    print(f"Failed to delete event {event.id}: {e}")
            
            kept_event = matching_events[-1]
            return f"Deleted {deleted_count} duplicate event(s). Kept '{kept_event.title}' from {kept_event.startTime.strftime('%I:%M %p')} to {kept_event.endTime.strftime('%I:%M %p')} at {kept_event.location or 'no location'}."
            
        except Exception as e:
            print(f"Error deleting duplicates: {e}")
            import traceback
            traceback.print_exc()
            return f"Sorry, I encountered an error: {str(e)}"


class SmolDeleteEventTool(Tool):
    """Tool to delete specific events from the calendar."""
    name = "delete_event"
    description = """Deletes event(s) from the calendar based on criteria.
    
    Use this when:
    - User says "delete event", "remove event", "cancel event"
    - User wants to delete a specific event by title/date
    - User wants to delete all events matching a title on a date
    
    This tool can delete single events or multiple matching events."""
    inputs = {
        "date": {
            "type": "string",
            "description": "Date of the event(s) to delete in YYYY-MM-DD format. If not provided, uses today's date.",
            "nullable": True
        },
        "title": {
            "type": "string",
            "description": "Title of the event(s) to delete. If not provided, deletes all events on the date.",
            "nullable": True
        },
        "delete_all_matching": {
            "type": "boolean",
            "description": "If true and title is provided, deletes all events with that title on the date. If false, deletes only one event.",
            "nullable": True
        }
    }
    output_type = "string"
    
    def forward(
        self, 
        date: Optional[str] = None,
        title: Optional[str] = None,
        delete_all_matching: Optional[bool] = None
    ) -> str:
        """Delete event(s) from calendar."""
        try:
            # Use today's date if not provided
            if not date:
                cet_tz = ZoneInfo("Europe/Berlin")
                date = datetime.now(cet_tz).strftime("%Y-%m-%d")
            
            # Get events for the date
            events = _run_async(get_calendar_events(date=date))
            
            if not events:
                return f"No events found on {date}."
            
            # Filter by title if provided
            if title:
                matching_events = [
                    e for e in events 
                    if title.lower() in e.title.lower()
                ]
                if not matching_events:
                    return f"No events found with title '{title}' on {date}."
            else:
                matching_events = events
            
            # Decide how many to delete
            if delete_all_matching or (title and len(matching_events) > 1):
                events_to_delete = matching_events
            else:
                # Delete only the first one if multiple exist
                events_to_delete = [matching_events[0]]
            
            deleted_count = 0
            deleted_titles = []
            
            for event in events_to_delete:
                try:
                    _run_async(delete_calendar_event(event.id))
                    deleted_count += 1
                    deleted_titles.append(event.title)
                except Exception as e:
                    print(f"Failed to delete event {event.id}: {e}")
            
            if deleted_count == 0:
                return "No events were deleted."
            
            # Build response message
            if deleted_count == 1:
                event = events_to_delete[0]
                # Handle both datetime objects and ISO strings
                if isinstance(event.startTime, str):
                    start_dt = datetime.fromisoformat(event.startTime.replace('Z', '+00:00'))
                else:
                    start_dt = event.startTime
                time_str = start_dt.strftime('%I:%M %p').lstrip('0')
                return f"Successfully deleted '{event.title}' scheduled at {time_str} on {date}."
            else:
                unique_titles = set(deleted_titles)
                titles_str = ", ".join([f"'{t}'" for t in unique_titles])
                return f"Successfully deleted {deleted_count} event(s): {titles_str} on {date}."
            
        except Exception as e:
            print(f"Error deleting event(s): {e}")
            import traceback
            traceback.print_exc()
            return f"Sorry, I encountered an error while deleting the event(s): {str(e)}"
