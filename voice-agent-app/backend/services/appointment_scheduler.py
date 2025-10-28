from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional


@dataclass
class CalendarSlot:
    start: datetime
    end: datetime
    booked: bool = False
    patient_name: Optional[str] = None


class MockCalendarService:
    def __init__(self, calendar_id: str, timezone: str = "America/New_York"):
        self.calendar_id = calendar_id
        self.timezone = timezone
        self._slots = self._seed_slots()

    def _seed_slots(self) -> List[CalendarSlot]:
        slots: List[CalendarSlot] = []
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        for day_offset in range(0, 7):
            base = today + timedelta(days=day_offset)
            for hour in (9, 10, 11, 13, 14, 15):
                start = base.replace(hour=hour)
                slots.append(CalendarSlot(start=start, end=start + timedelta(minutes=30)))
        return slots

    def list_slots(self) -> List[Dict]:
        return [
            {
                "start": slot.start.isoformat(),
                "end": slot.end.isoformat(),
                "booked": slot.booked,
                "patientName": slot.patient_name,
            }
            for slot in self._slots
        ]

    def find_available_slot(self, preferred_date: Optional[datetime] = None) -> Optional[CalendarSlot]:
        for slot in self._slots:
            if slot.booked:
                continue
            if preferred_date and slot.start.date() != preferred_date.date():
                continue
            return slot
        return None

    def book_slot(self, patient_name: str, preferred_date: Optional[datetime] = None) -> Optional[Dict]:
        slot = self.find_available_slot(preferred_date)
        if not slot:
            return None
        slot.booked = True
        slot.patient_name = patient_name
        return {
            "calendarId": self.calendar_id,
            "start": slot.start.isoformat(),
            "end": slot.end.isoformat(),
            "patientName": patient_name,
        }


class AppointmentSchedulerService:
    def __init__(self):
        self._calendars: Dict[str, MockCalendarService] = {}

    def get_calendar(self, calendar_id: str) -> MockCalendarService:
        if calendar_id not in self._calendars:
            self._calendars[calendar_id] = MockCalendarService(calendar_id)
        return self._calendars[calendar_id]

    def list_availability(self, calendar_id: str) -> List[Dict]:
        calendar = self.get_calendar(calendar_id)
        return calendar.list_slots()

    def book(self, calendar_id: str, patient_name: str, preferred_date: Optional[datetime] = None) -> Optional[Dict]:
        calendar = self.get_calendar(calendar_id)
        return calendar.book_slot(patient_name=patient_name, preferred_date=preferred_date)


