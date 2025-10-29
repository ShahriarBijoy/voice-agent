import json
from openai import AsyncOpenAI
from config import settings
from typing import AsyncGenerator, List, Dict, Optional, Any

from agents.tool_registry import tool_registry

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.conversation_history: List[Dict[str, Any]] = []
        self.system_prompt: str = ""

    async def generate_response(
        self,
        user_message: str,
        system_prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate streaming response from LLM, handling tool calls.
        Yields dictionaries representing different event types (text, tool_result).
        """
        if self.system_prompt != system_prompt:
            self.conversation_history = []
            self.system_prompt = system_prompt

        self.conversation_history.append({"role": "user", "content": user_message})
        
        messages = [{"role": "system", "content": system_prompt}] + self.conversation_history
        
        try:
            stream = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=1024,
                tools=tool_registry.get_tool_schemas(),
                tool_choice="auto",
            )
            
            full_response = ""
            tool_calls = []
            
            async for chunk in stream:
                delta = chunk.choices[0].delta
                
                if delta.content:
                    content = delta.content
                    full_response += content
                    yield {"type": "text", "content": content}
                
                if delta.tool_calls:
                    for tool_call_chunk in delta.tool_calls:
                        if len(tool_calls) <= tool_call_chunk.index:
                            tool_calls.append({
                                "id": "", "type": "function", "function": {"name": "", "arguments": ""}
                            })
                        
                        tc = tool_calls[tool_call_chunk.index]
                        if tool_call_chunk.id:
                            tc["id"] = tool_call_chunk.id
                        if tool_call_chunk.function:
                            if tool_call_chunk.function.name:
                                tc["function"]["name"] = tool_call_chunk.function.name
                            if tool_call_chunk.function.arguments:
                                tc["function"]["arguments"] += tool_call_chunk.function.arguments
            
            # Add assistant's turn to history
            assistant_message = {"role": "assistant", "content": full_response}
            if tool_calls:
                assistant_message["tool_calls"] = tool_calls
            self.conversation_history.append(assistant_message)

            # If there are tool calls, execute them
            if tool_calls:
                # Add a placeholder for the tool results in the history
                tool_messages = []
                for tool_call in tool_calls:
                    tool_name = tool_call["function"]["name"]
                    tool_to_call = tool_registry.get_tool(tool_name)
                    tool_args = json.loads(tool_call["function"]["arguments"])

                    tool_result = await tool_to_call.run(**tool_args)

                    tool_messages.append(
                        {
                            "tool_call_id": tool_call["id"],
                            "role": "tool",
                            "name": tool_name,
                            "content": str(tool_result),
                        }
                    )
                
                self.conversation_history.extend(tool_messages)

                # Now, get the final response from the LLM after providing tool results
                final_stream = await self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt}
                    ]
                    + self.conversation_history,
                    stream=True,
                )

                final_full_response = ""
                async for final_chunk in final_stream:
                    if final_chunk.choices[0].delta.content:
                        content = final_chunk.choices[0].delta.content
                        final_full_response += content
                        yield {"type": "text", "content": content}

                # Add final assistant response to history
                self.conversation_history.append(
                    {"role": "assistant", "content": final_full_response}
                )

        except Exception as e:
            print(f"LLM error: {e}")
            yield {"type": "error", "content": f"I apologize, but I encountered an error: {str(e)}"}

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
