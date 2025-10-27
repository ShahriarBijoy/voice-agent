from fastapi import APIRouter, HTTPException
import os
import json

router = APIRouter()


@router.get("/conversations")
async def get_conversations():
    """Get list of all conversations"""
    try:
        conversations_dir = "conversations"
        if not os.path.exists(conversations_dir):
            return []

        conversations = []
        for filename in os.listdir(conversations_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(conversations_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        conversations.append({
                            "id": data["id"],
                            "title": data["title"],
                            "created_at": data["created_at"],
                            "updated_at": data["updated_at"],
                            "message_count": len(data["messages"])
                        })
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
                    continue

        # Sort by updated_at descending (most recent first)
        conversations.sort(key=lambda x: x["updated_at"], reverse=True)
        return conversations
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, 
                          detail="Failed to fetch conversations")


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation by ID"""
    try:
        file_path = os.path.join("conversations", 
                                f"{conversation_id}.json")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, 
                              detail="Conversation not found")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, 
                          detail="Failed to fetch conversation")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a specific conversation by ID"""
    try:
        file_path = os.path.join("conversations", 
                                f"{conversation_id}.json")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, 
                              detail="Conversation not found")

        os.remove(file_path)
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, 
                          detail="Failed to delete conversation")
