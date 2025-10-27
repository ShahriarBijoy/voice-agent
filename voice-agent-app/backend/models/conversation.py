from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
import json
import os
import uuid


@dataclass
class Message:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class Conversation:
    id: str
    messages: List[Message]
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    title: Optional[str] = None


class ConversationManager:
    def __init__(self):
        self.messages: List[Message] = []
        self.current_user_input = ""
        self.is_speaking = False
        self.conversation_id: Optional[str] = None
        self.conversations_dir = "conversations"
        self._ensure_conversations_dir()

    def _ensure_conversations_dir(self):
        """Ensure conversations directory exists"""
        if not os.path.exists(self.conversations_dir):
            os.makedirs(self.conversations_dir)

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
        self.conversation_id = None

    def save_conversation(self) -> Optional[str]:
        """Save current conversation and return conversation ID"""
        if not self.messages:
            return None
        
        # Generate conversation ID if not exists
        if not self.conversation_id:
            self.conversation_id = str(uuid.uuid4())
        
        # Create conversation title from first user message
        title = None
        for msg in self.messages:
            if msg.role == "user" and msg.content.strip():
                title = msg.content.strip()[:50] + "..." if len(msg.content.strip()) > 50 else msg.content.strip()
                break
        
        conversation = Conversation(
            id=self.conversation_id,
            messages=self.messages.copy(),
            title=title
        )
        
        # Save to file
        file_path = os.path.join(self.conversations_dir, f"{self.conversation_id}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump({
                "id": conversation.id,
                "title": conversation.title,
                "created_at": conversation.created_at.isoformat(),
                "updated_at": conversation.updated_at.isoformat(),
                "messages": [
                    {
                        "role": msg.role,
                        "content": msg.content,
                        "timestamp": msg.timestamp.isoformat()
                    }
                    for msg in conversation.messages
                ]
            }, f, indent=2, ensure_ascii=False)
        
        return self.conversation_id

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Load conversation by ID"""
        file_path = os.path.join(self.conversations_dir, f"{conversation_id}.json")
        if not os.path.exists(file_path):
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            messages = [
                Message(
                    role=msg["role"],
                    content=msg["content"],
                    timestamp=datetime.fromisoformat(msg["timestamp"])
                )
                for msg in data["messages"]
            ]
            
            return Conversation(
                id=data["id"],
                messages=messages,
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.fromisoformat(data["updated_at"]),
                title=data.get("title")
            )
        except Exception as e:
            print(f"Error loading conversation {conversation_id}: {e}")
            return None

    def list_conversations(self) -> List[Dict]:
        """List all saved conversations"""
        conversations = []
        if not os.path.exists(self.conversations_dir):
            return conversations
        
        for filename in os.listdir(self.conversations_dir):
            if filename.endswith('.json'):
                conversation_id = filename[:-5]  # Remove .json extension
                conversation = self.get_conversation(conversation_id)
                if conversation:
                    conversations.append({
                        "id": conversation.id,
                        "title": conversation.title,
                        "created_at": conversation.created_at.isoformat(),
                        "updated_at": conversation.updated_at.isoformat(),
                        "message_count": len(conversation.messages)
                    })
        
        # Sort by updated_at descending
        conversations.sort(key=lambda x: x["updated_at"], reverse=True)
        return conversations
