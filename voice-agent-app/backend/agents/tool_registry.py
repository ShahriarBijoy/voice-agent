from abc import ABC, abstractmethod
from typing import Any, Dict, List, Type

class Tool(ABC):
    """Abstract base class for all tools."""

    @property
    @abstractmethod
    def name(self) -> str:
        """The name of the tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """A description of what the tool does."""
        pass

    @property
    @abstractmethod
    def schema(self) -> Dict[str, Any]:
        """The schema defining the tool's input parameters."""
        pass

    @abstractmethod
    async def run(self, **kwargs: Any) -> Any:
        """Executes the tool with the given parameters."""
        pass


class ToolRegistry:
    """A registry for managing and accessing tools."""

    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register_tool(self, tool: Tool):
        """Registers a tool in the registry."""
        if tool.name in self._tools:
            raise ValueError(f"Tool with name '{tool.name}' is already registered.")
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Tool:
        """Retrieves a tool by its name."""
        tool = self._tools.get(name)
        if not tool:
            raise ValueError(f"No tool found with the name '{name}'.")
        return tool

    def get_all_tools(self) -> List[Tool]:
        """Returns a list of all registered tools."""
        return list(self._tools.values())

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Returns the schemas of all registered tools."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.schema,
                },
            }
            for tool in self._tools.values()
        ]

# Global instance of the tool registry
tool_registry = ToolRegistry()
