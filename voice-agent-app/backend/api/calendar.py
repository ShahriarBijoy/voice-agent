from fastapi import APIRouter, HTTPException
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

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    participants: Optional[List[str]] = None

@router.get("/api/calendar", response_model=List[CalendarEvent])
async def get_calendar_events(date: Optional[str] = None):
    """
    Get calendar events. If a date is provided, filter events for that day.
    Date should be in YYYY-MM-DD format.
    """
    # Convert stored data to CalendarEvent objects
    # Handle both datetime objects and ISO strings in stored data
    events = []
    for evt in DEMO_CALENDAR_DATA:
        evt_copy = evt.copy()
        # Parse ISO strings to datetime if needed
        if isinstance(evt_copy.get("startTime"), str):
            evt_copy["startTime"] = datetime.fromisoformat(evt_copy["startTime"].replace('Z', '+00:00'))
        if isinstance(evt_copy.get("endTime"), str):
            evt_copy["endTime"] = datetime.fromisoformat(evt_copy["endTime"].replace('Z', '+00:00'))
        events.append(CalendarEvent(**evt_copy))
    
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
    
    # Convert datetime objects to ISO strings for storage
    if isinstance(new_event_dict.get("startTime"), datetime):
        new_event_dict["startTime"] = new_event_dict["startTime"].isoformat()
    if isinstance(new_event_dict.get("endTime"), datetime):
        new_event_dict["endTime"] = new_event_dict["endTime"].isoformat()
    
    # In a real application, you would save this to a database.
    # For this demo, we just append it to our in-memory list.
    DEMO_CALENDAR_DATA.append(new_event_dict)
    
    print(f"✅ Event created: {new_event_dict['title']} on {new_event_dict['startTime']}")
    
    # We need to convert it back to a Pydantic model to ensure it matches
    # the response_model.
    created_event = CalendarEvent(**new_event_dict)
    
    return created_event


@router.put("/api/calendar/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(event_id: str, event: CalendarEventUpdate):
    """
    Update an existing calendar event.
    """
    # Find event by id
    idx = next((i for i, e in enumerate(DEMO_CALENDAR_DATA) if e.get("id") == event_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = DEMO_CALENDAR_DATA[idx]
    update_data = event.dict(exclude_unset=True)

    # Merge update
    merged = { **existing, **update_data }
    DEMO_CALENDAR_DATA[idx] = merged

    return CalendarEvent(**merged)


@router.delete("/api/calendar/{event_id}")
async def delete_calendar_event(event_id: str):
    """
    Delete a calendar event by id.
    """
    idx = next((i for i, e in enumerate(DEMO_CALENDAR_DATA) if e.get("id") == event_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Event not found")

    DEMO_CALENDAR_DATA.pop(idx)
    return {"status": "ok"}

