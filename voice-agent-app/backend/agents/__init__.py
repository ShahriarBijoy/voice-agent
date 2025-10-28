from .tool_registry import tool_registry
from .calendar_tool import CalendarTool

def initialize_tools():
  """
  Initializes and registers all the tools in the system.
  """
  calendar_tool = CalendarTool()
  tool_registry.register_tool(calendar_tool)
  print("🛠️ Tools initialized and registered.")

# You can add more tool initializations here as you create them
