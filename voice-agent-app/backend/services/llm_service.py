from openai import AsyncOpenAI
from config import settings
from typing import AsyncGenerator

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.conversation_history = []

    async def generate_response(
        self,
        user_message: str,
        system_prompt: str
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from LLM"""
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # Prepare messages
        messages = [
            {"role": "system", "content": system_prompt}
        ] + self.conversation_history
        
        try:
            # Stream response
            stream = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=500
            )
            
            full_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield content
            
            # Add assistant response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": full_response
            })
            
        except Exception as e:
            print(f"LLM error: {e}")
            yield f"I apologize, but I encountered an error: {str(e)}"

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
