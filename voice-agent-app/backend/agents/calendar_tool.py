from typing import Any, Dict, Optional
from datetime import datetime

from .tool_registry import Tool
from api.calendar import get_calendar_events

class CalendarTool(Tool):
    """A tool for checking the user's calendar for events."""

    @property
    def name(self) -> str:
        return "check_calendar"

    @property
    def description(self) -> str:
        return "Checks the user's calendar for events on a specific date. Use today's date if no date is specified."

    @property
    def schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "The date to check for events, in YYYY-MM-DD format. Defaults to today.",
                }
            },
            "required": [],
        }

    async def run(self, date: Optional[str] = None, **kwargs: Any) -> Any:
        """
        Runs the calendar tool to fetch events by calling the API function directly.
        """
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        print(f"Checking calendar for date: {date}")

        try:
            events = await get_calendar_events(date=date)

            if not events:
                return f"You have no events scheduled for {date}."

            event_summaries = []
            for event in events:
                start_time = event.startTime.strftime('%-I:%M %p')
                end_time = event.endTime.strftime('%-I:%M %p')
                event_summaries.append(f"- {event.title} from {start_time} to {end_time}")
            
            return f"On {date}, you have the following events:\n" + "\\n".join(event_summaries)

        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return "Sorry, an unexpected error occurred while checking your calendar."
