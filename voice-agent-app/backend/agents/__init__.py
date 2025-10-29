from .tool_registry import tool_registry
from .calendar_tool import CalendarTool
from .book_appointment_tool import BookAppointmentTool


def initialize_tools():
  """
  Initializes and registers all the tools in the system.
  """
  calendar_tool = CalendarTool()
  book_appointment_tool = BookAppointmentTool()
  
  tool_registry.register_tool(calendar_tool)
  tool_registry.register_tool(book_appointment_tool)
  
  print("🛠️ Tools initialized and registered.")

# You can add more tool initializations here as you create them
