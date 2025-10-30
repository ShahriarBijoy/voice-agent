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
from api.calendar import get_calendar_events, create_calendar_event, CalendarEventCreate


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
    description = "Checks the calendar for events on a specified date. If no date is given, it checks for today. When the user asks about 'today' or 'tomorrow', calculate the date in Central European Time."
    inputs = {
        "date": {
            "type": "string",
            "description": "The date to check for events, in YYYY-MM-DD format. If not provided, checks today's date.",
            "nullable": True
        }
    }
    output_type = "string"
    
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
        
        print(f"Checking calendar for date: {date}")
        
        try:
            events = _run_async(get_calendar_events(date=date))

            if not events:
                return f"You have no events scheduled for {date}."

            event_summaries = []
            for event in events:
                start_time = event.startTime.strftime('%I:%M %p').lstrip('0')
                end_time = event.endTime.strftime('%I:%M %p').lstrip('0')
                event_summaries.append(f"- {event.title} from {start_time} to {end_time}")

            return f"On {date}, you have the following events:\n" + "\n".join(event_summaries)

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
    description = """Books a new appointment or event in the calendar. Use this when the user wants to schedule, book, or add an event/appointment/meeting. 
    
    IMPORTANT: Only call this tool AFTER the user has explicitly confirmed the event details. Always ask for confirmation first by summarizing the details (title, date, time, location) and waiting for the user to say "yes", "correct", "that's right", "go ahead", or similar confirmation.
    
    Important: You must convert relative times to absolute ISO datetime strings:
    - "tomorrow at 3 PM" → calculate tomorrow's date and format as "2025-10-30T15:00:00"
    - "today at 2:30" → use today's date and format as "2025-10-29T14:30:00"
    - "3 to 4" or "3-4" → "15:00:00" to "16:00:00"
    
    Always gather: title, startTime (ISO format), endTime (ISO format). Location and description are optional."""
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

            event_data = CalendarEventCreate(
                title=title,
                startTime=datetime.fromisoformat(startTime),
                endTime=datetime.fromisoformat(endTime),
                description=description,
                location=location,
                participants=participants
            )
            
            created_event = _run_async(create_calendar_event(event_data))
            
            start_time_str = created_event.startTime.strftime('%I:%M %p').lstrip('0')
            return f"Successfully booked '{created_event.title}' on {created_event.startTime.strftime('%B %d, %Y')} at {start_time_str}."

        except Exception as e:
            print(f"Error booking appointment: {e}")
            import traceback
            traceback.print_exc()
            return f"Sorry, I encountered an error while trying to book the appointment: {str(e)}"
