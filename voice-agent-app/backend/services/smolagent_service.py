"""
Smolagents-based LLM service with improved memory management.
This service uses smolagents' ToolCallingAgent with persistent memory
to maintain full conversation context across all interactions.
"""
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import AsyncGenerator, Dict, Optional, Any, List
from config import settings

from smolagents import ToolCallingAgent, LiteLLMModel
from agents.smolagents_tools import (
    SmolCalendarTool, 
    SmolBookAppointmentTool,
    SmolDeleteDuplicatesTool,
    SmolDeleteEventTool
)


class SmolAgentService:
    """
    LLM service using smolagents ToolCallingAgent with persistent memory.
    The agent maintains a single instance throughout the conversation to
    preserve full context and prevent memory loss.
    """
    def __init__(self):
        # Initialize LiteLLM model for OpenAI
        self.model = LiteLLMModel(
            model_id=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )

        # Initialize tools with context access
        self.calendar_tool = SmolCalendarTool()
        self.book_appointment_tool = SmolBookAppointmentTool()
        self.delete_duplicates_tool = SmolDeleteDuplicatesTool()
        self.delete_event_tool = SmolDeleteEventTool()
        
        self.tools = [
            self.calendar_tool,
            self.book_appointment_tool,
            self.delete_duplicates_tool,
            self.delete_event_tool,
        ]

        # Single persistent agent - DO NOT recreate unless explicitly clearing
        self.agent: Optional[ToolCallingAgent] = None
        self.system_prompt: str = ""
        
        # Enhanced conversation history with metadata
        self.conversation_history: List[Dict[str, Any]] = []
        
        # Track last event details for context
        self.last_event_context: Optional[Dict[str, Any]] = None

    def _create_agent_if_needed(self):
        """Create agent only if it doesn't exist."""
        if self.agent is None:
            self.agent = ToolCallingAgent(
                tools=self.tools,
                model=self.model,
                max_steps=5,  # Allow multiple tool calls
            )

    def _inject_context_to_tools(self):
        """Inject conversation context into tools for better awareness."""
        # Share last event context with tools
        if hasattr(self.calendar_tool, 'set_context'):
            self.calendar_tool.set_context(self.last_event_context)
        if hasattr(self.book_appointment_tool, 'set_context'):
            self.book_appointment_tool.set_context(
                self.last_event_context
            )

    def _extract_event_context(self, message: str) -> None:
        """Extract and store event details from messages for context."""
        # Store event details mentioned in conversation
        lower_msg = message.lower()

        # Extract potential event title
        keywords = ["meeting", "event", "appointment"]
        if any(kw in lower_msg for kw in keywords):
            # Store as potential event context
            if self.last_event_context is None:
                self.last_event_context = {}

            # Extract date mentions
            if "tomorrow" in lower_msg:
                self.last_event_context["relative_date"] = "tomorrow"
            elif "today" in lower_msg:
                self.last_event_context["relative_date"] = "today"
            elif "november" in lower_msg or "october" in lower_msg:
                self.last_event_context["has_specific_date"] = True

    def _get_filler_for_intent(self, text: str) -> Optional[str]:
        """Return a filler message based on predicted intent."""
        t = text.lower()

        # Calendar check keywords
        check_keywords = [
            "check", "show", "what's on", "do i have",
            "any event", "where is"
        ]
        if any(k in t for k in check_keywords):
            return "Let me check that for you..."

        # Booking keywords
        book_keywords = [
            "book", "schedule", "add", "create", "make an appointment"
        ]
        if any(k in t for k in book_keywords):
            return "Sure, let me help you with that."

        return None

    def _summarize_old_messages(
        self, messages: List[Dict[str, Any]]
    ) -> str:
        """
        Summarize older messages to reduce token usage.
        Extracts key information like event details, names, locations.
        """
        summary_parts = []

        for msg in messages:
            content = msg.get("content", "").lower()

            # Extract key information patterns
            keywords = ["meeting", "event", "appointment"]
            if any(kw in content for kw in keywords):
                summary_parts.append(msg.get("content", ""))
            elif "location" in content or "where" in content:
                summary_parts.append(msg.get("content", ""))
            elif "time" in content or "when" in content:
                summary_parts.append(msg.get("content", ""))

        if summary_parts:
            summary = " | ".join(summary_parts[:5])
            return f"Earlier context (summarized): {summary}"
        return ""

    def _build_rich_context(self, user_message: str, system_prompt: str) -> str:
        """
        Build optimized context - balance between memory and speed.
        """
        cet_tz = ZoneInfo("Europe/Berlin")
        now = datetime.now(cet_tz)
        date_str = now.strftime("%A, %B %d, %Y")
        time_str = now.strftime("%I:%M %p")

        context_parts = []

        # Compact temporal context
        context_parts.append(
            f"Date: {date_str} | Time: {time_str} CET\n"
        )

        # Add system instructions
        if system_prompt:
            context_parts.append(system_prompt)

        # Optimized history - keep last 15 messages for speed
        if self.conversation_history:
            history_limit = 15
            recent_msgs = self.conversation_history[-history_limit:]

            for msg in recent_msgs:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = msg.get("content", "")
                context_parts.append(f"{role}: {content}")

        # Add current message
        context_parts.append(f"User: {user_message}")

        return "\n\n".join(context_parts)

    async def generate_response(
        self,
        user_message: str,
        system_prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a response while maintaining full conversation context.
        """
        # Create agent if it doesn't exist (only once per session)
        self._create_agent_if_needed()
        
        # Update system prompt if changed (but DON'T recreate agent)
        if self.system_prompt != system_prompt:
            self.system_prompt = system_prompt
        
        # Extract event context from user message
        self._extract_event_context(user_message)
        
        # Inject context into tools
        self._inject_context_to_tools()
        
        # Build rich context with full history
        query = self._build_rich_context(user_message, system_prompt)
        
        # Record user message with timestamp
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now(ZoneInfo("Europe/Berlin")).isoformat()
        })

        # Yield a filler message if we predict a tool will be used
        filler_message = self._get_filler_for_intent(user_message)
        if filler_message:
            yield {"type": "filler", "content": filler_message}

        try:
            loop = asyncio.get_event_loop()

            def run_agent():
                """Run agent in executor to avoid blocking."""
                return self.agent.run(query)

            # Execute agent
            result = await loop.run_in_executor(None, run_agent)
            full_response = str(result) if result else ""

            # Update event context from response
            self._extract_event_context(full_response)

            # Stream the final text response back in chunks
            if full_response:
                chunk_size = 10
                for i in range(0, len(full_response), chunk_size):
                    chunk = full_response[i : i + chunk_size]
                    yield {"type": "text", "content": chunk}
                    await asyncio.sleep(0.01)

            # Record assistant response with timestamp
            self.conversation_history.append({
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.now(
                    ZoneInfo("Europe/Berlin")
                ).isoformat()
            })

        except Exception as e:
            print(f"❌ SmolAgent error: {e}")
            import traceback
            traceback.print_exc()
            message = f"I apologize, but I encountered an error: {str(e)}"
            yield {"type": "error", "content": message}

    def clear_history(self):
        """Clear conversation history and reset agent."""
        # Completely reset agent to clear its internal memory
        self.agent = None
        self.conversation_history = []
        self.last_event_context = None
        print("🧹 Cleared agent memory and conversation history")
