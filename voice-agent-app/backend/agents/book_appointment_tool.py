from datetime import datetime
from typing import Any, Dict, Optional, List

from .tool_registry import Tool
from api.calendar import create_calendar_event, CalendarEventCreate

class BookAppointmentTool(Tool):
    """
    A tool to book an appointment in the user's calendar.
    """
    name = "book_appointment"
    description = """Books a new appointment or event in the calendar. Use this when the user wants to schedule, book, or add an event/appointment/meeting. 
    
    Important: You must convert relative times to absolute ISO datetime strings:
    - "tomorrow at 3 PM" → calculate tomorrow's date and format as "2025-10-30T15:00:00"
    - "today at 2:30" → use today's date and format as "2025-10-29T14:30:00"
    - "3 to 4" or "3-4" → "15:00:00" to "16:00:00"
    
    Always gather: title, startTime (ISO format), endTime (ISO format). Location and description are optional."""

    @property
    def schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "The title/name of the appointment or event.",
                        },
                        "startTime": {
                            "type": "string",
                            "description": "The start date and time in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-10-30T15:00:00' for October 30, 2025 at 3 PM). You must convert relative dates like 'tomorrow' to absolute dates.",
                        },
                        "endTime": {
                            "type": "string",
                            "description": "The end date and time in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-10-30T16:00:00' for October 30, 2025 at 4 PM). You must convert relative dates like 'tomorrow' to absolute dates.",
                        },
                        "description": {
                            "type": "string",
                            "description": "Optional brief description of what the appointment is about.",
                        },
                        "location": {
                            "type": "string",
                            "description": "Optional location where the appointment will take place (e.g., 'University of Bremen', 'Virtual/Zoom', 'Conference Room 4B').",
                        },
                        "participants": {
                            "type": "array",
                            "description": "Optional list of participant email addresses.",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["title", "startTime", "endTime"],
                },
            },
        }

    async def run(
        self,
        title: str,
        startTime: str,
        endTime: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        participants: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Any:
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
            
            created_event = await create_calendar_event(event_data)
            
            start_time_str = created_event.startTime.strftime('%I:%M %p').lstrip('0')
            return f"Successfully booked '{created_event.title}' on {created_event.startTime.strftime('%B %d, %Y')} at {start_time_str}."

        except Exception as e:
            print(f"Error booking appointment: {e}")
            return f"Sorry, I encountered an error while trying to book the appointment: {str(e)}"
