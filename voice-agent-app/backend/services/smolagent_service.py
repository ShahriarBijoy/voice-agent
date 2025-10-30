"""
Smolagents-based LLM service with improved memory management.
This service uses smolagents' ToolCallingAgent, which has built-in memory
management to prevent the agent from forgetting previous conversation context.
"""
import asyncio
from typing import AsyncGenerator, Dict, Optional, Any
from config import settings

from smolagents import ToolCallingAgent, LiteLLMModel
from agents.smolagents_tools import SmolCalendarTool, SmolBookAppointmentTool


class SmolAgentService:
    """
    LLM service using smolagents ToolCallingAgent.
    Provides better memory management and context retention.
    The agent maintains conversation history automatically through its memory
    system.
    """
    def __init__(self):
        # Initialize LiteLLM model for OpenAI
        self.model = LiteLLMModel(
            model_id=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )

        # Initialize tools
        self.tools = [
            SmolCalendarTool(),
            SmolBookAppointmentTool(),
        ]

        # A single agent for the entire conversation
        self.agent: Optional[ToolCallingAgent] = None
        self.system_prompt: str = ""
        self.conversation_history: list[dict[str, Any]] = []

    def _create_agent(self, system_prompt: str = ""):
        """Create a new agent."""
        self.agent = ToolCallingAgent(
            tools=self.tools,
            model=self.model,
        )
        self.system_prompt = system_prompt

    async def generate_response(
        self,
        user_message: str,
        system_prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        # Recreate agent only when the system prompt changes or it's not created
        if self.system_prompt != system_prompt or self.agent is None:
            self._create_agent(system_prompt)
            self.conversation_history = []

        # Build conversation context, including system prompt and history
        conversation_context_parts = []
        if system_prompt:
            instructions = f"[SYSTEM INSTRUCTIONS]\n{system_prompt}"
            conversation_context_parts.append(instructions)
        
        for msg in self.conversation_history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            role_name = "User" if role == "user" else "Assistant"
            conversation_context_parts.append(f"{role_name}: {content}")
        
        conversation_context_parts.append(f"User: {user_message}")
        query = "\n\n".join(conversation_context_parts)
        
        # Record user message
        self.conversation_history.append({"role": "user", "content": user_message})

        try:
            loop = asyncio.get_event_loop()

            def run_agent():
                return self.agent.run(query)

            result = await loop.run_in_executor(None, run_agent)
            full_response = str(result) if result else ""
            chunk_size = 10
            for i in range(0, len(full_response), chunk_size):
                chunk = full_response[i:i + chunk_size]
                yield {"type": "text", "content": chunk}
                await asyncio.sleep(0.01)
            
            # Record assistant response
            self.conversation_history.append(
                {
                    "role": "assistant",
                    "content": full_response,
                }
            )

        except Exception as e:
            print(f"SmolAgent error: {e}")
            import traceback
            traceback.print_exc()
            message = (
                "I apologize, but I encountered an error: {0}".format(str(e))
            )
            yield {"type": "error", "content": message}

    def clear_history(self):
        # Re-create agent to clear its internal memory
        if self.agent is not None:
            self._create_agent(self.system_prompt)
            self.conversation_history = []
