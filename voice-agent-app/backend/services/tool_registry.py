from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from services.appointment_scheduler import AppointmentSchedulerService


class AgentToolRegistry:
    def __init__(self):
        self.scheduler = AppointmentSchedulerService()

    async def execute(self, tool: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        tool_type = tool.get("type")

        if tool_type == "appointment-scheduler":
            patient_name = payload.get("patientName") or "Patient"
            preferred_date = payload.get("preferredDate")
            parsed_date = None
            if preferred_date:
                try:
                    parsed_date = datetime.fromisoformat(preferred_date)
                except ValueError:
                    parsed_date = None

            booking = self.scheduler.book(
                calendar_id=tool["config"].get("calendarId"),
                patient_name=patient_name,
                preferred_date=parsed_date,
            )
            if not booking:
                return {
                    "status": "unavailable",
                    "message": "No appointments available on the requested date.",
                }
            return {
                "status": "booked",
                "booking": booking,
                "message": f"Appointment booked for {booking['patientName']} on {booking['start']}.",
            }

        return {
            "status": "unsupported",
            "message": f"Tool {tool_type} is not implemented",
        }


