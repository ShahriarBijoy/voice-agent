from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# Mock database from the frontend demo data
DEMO_CALENDAR_DATA = [
  {
    "id": "evt_1",
    "title": "Project Titan Kick-off",
    "startTime": "2025-10-28T09:00:00",
    "endTime": "2025-10-28T10:00:00",
    "participants": ["user@example.com", "teammate1@example.com"],
  },
  {
    "id": "evt_2",
    "title": "Weekly Sync",
    "startTime": "2025-10-28T11:30:00",
    "endTime": "2025-10-28T12:00:00",
    "participants": ["user@example.com", "teammate2@example.com", "manager@example.com"],
  },
  {
    "id": "evt_3",
    "title": "Dentist Appointment",
    "startTime": "2025-10-28T15:00:00",
    "endTime": "2025-10-28T16:00:00",
    "participants": ["user@example.com"],
  },
  {
    "id": "evt_4",
    "title": "Q4 Planning Session",
    "startTime": "2025-10-29T10:00:00",
    "endTime": "2025-10-29T12:30:00",
    "participants": ["user@example.com", "teammate1@example.com", "manager@example.com"],
  }
]

class CalendarEvent(BaseModel):
    id: str
    title: str
    startTime: datetime
    endTime: datetime
    participants: List[str]

@router.get("/api/calendar", response_model=List[CalendarEvent])
async def get_calendar_events(date: Optional[str] = None):
    """
    Get calendar events. If a date is provided, filter events for that day.
    Date should be in YYYY-MM-DD format.
    """
    events = [CalendarEvent(**evt) for evt in DEMO_CALENDAR_DATA]
    
    if date:
        try:
            filter_date = datetime.fromisoformat(date).date()
            return [
                event for event in events
                if event.startTime.date() == filter_date
            ]
        except ValueError:
            # Handle cases where date is not in correct format, maybe log it
            return events
            
    return events


