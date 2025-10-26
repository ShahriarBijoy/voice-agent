from dataclasses import dataclass, field
from typing import List, Dict
from datetime import datetime

@dataclass
class Message:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = field(default_factory=datetime.now)

class ConversationManager:
    def __init__(self):
        self.messages: List[Message] = []
        self.current_user_input = ""
        self.is_speaking = False

    def add_message(self, role: str, content: str):
        """Add message to conversation history"""
        message = Message(role=role, content=content)
        self.messages.append(message)
        return message

    def get_history(self, max_messages: int = 10) -> List[Dict]:
        """Get recent conversation history"""
        recent = self.messages[-max_messages:] if len(self.messages) > max_messages else self.messages
        return [{"role": msg.role, "content": msg.content} for msg in recent]

    def clear(self):
        """Clear conversation history"""
        self.messages = []
        self.current_user_input = ""
