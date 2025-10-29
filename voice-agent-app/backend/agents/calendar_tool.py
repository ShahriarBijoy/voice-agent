from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Any, Dict, Optional

from .tool_registry import Tool
from api.calendar import get_calendar_events

class CalendarTool(Tool):
    """
    A tool to check the user's calendar for a given date.
    """
    name = "check_calendar"
    description = "Checks the calendar for events on a specified date. If no date is given, it checks for today. When the user asks about 'today' or 'tomorrow', calculate the date in Central European Time."

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
                        "date": {
                            "type": "string",
                            "description": "The date to check for events, in YYYY-MM-DD format.",
                        }
                    },
                    "required": [],
                },
            },
        }

    async def run(self, date: Optional[str] = None, **kwargs: Any) -> Any:
        if not date:
            # Use Central European Time for current date
            cet_tz = ZoneInfo("Europe/Berlin")
            date = datetime.now(cet_tz).strftime("%Y-%m-%d")
        
        print(f"Checking calendar for date: {date}")
        
        try:
            events = await get_calendar_events(date=date)

            if not events:
                return f"You have no events scheduled for {date}."

            event_summaries = []
            for event in events:
                start_time = event.startTime.strftime('%I:%M %p').lstrip('0')
                end_time = event.endTime.strftime('%I:%M %p').lstrip('0')
                event_summaries.append(f"- {event.title} from {start_time} to {end_time}")

            return f"On {date}, you have the following events:\\n" + "\\n".join(event_summaries)

        except Exception as e:
            print(f"An unexpected error occurred while checking calendar: {e}")
            return "Sorry, an unexpected error occurred while checking your calendar."
