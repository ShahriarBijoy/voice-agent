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
    "description": "Initial meeting to kick off the Project Titan development.",
    "location": "Virtual / Zoom",
    "startTime": "2025-10-28T09:00:00",
    "endTime": "2025-10-28T10:00:00",
    "participants": ["user@example.com", "teammate1@example.com"],
  },
  {
    "id": "evt_2",
    "title": "Weekly Sync",
    "description": "Team weekly sync meeting.",
    "location": "Conference Room 4B",
    "startTime": "2025-10-28T11:30:00",
    "endTime": "2025-10-28T12:00:00",
    "participants": ["user@example.com", "teammate2@example.com", "manager@example.com"],
  },
  {
    "id": "evt_3",
    "title": "Dentist Appointment",
    "description": "Annual dental check-up.",
    "location": "Downtown Dental Clinic",
    "startTime": "2025-10-28T15:00:00",
    "endTime": "2025-10-28T16:00:00",
    "participants": ["user@example.com"],
  },
  {
    "id": "evt_4",
    "title": "Q4 Planning Session",
    "description": "Planning session for the upcoming quarter.",
    "location": "Virtual / Teams",
    "startTime": "2025-10-29T10:00:00",
    "endTime": "2025-10-29T12:30:00",
    "participants": ["user@example.com", "teammate1@example.com", "manager@example.com"],
  }
]

class CalendarEvent(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    startTime: datetime
    endTime: datetime
    participants: List[str]

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
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


@router.post("/api/calendar", response_model=CalendarEvent)
async def create_calendar_event(event: CalendarEventCreate):
    """
    Create a new calendar event.
    """
    new_event_dict = event.dict()
    new_event_dict["id"] = f"evt_{len(DEMO_CALENDAR_DATA) + 1}"
    
    # In a real application, you would save this to a database.
    # For this demo, we just append it to our in-memory list.
    DEMO_CALENDAR_DATA.append(new_event_dict)
    
    # We need to convert it back to a Pydantic model to ensure it matches
    # the response_model.
    created_event = CalendarEvent(**new_event_dict)
    
    return created_event


