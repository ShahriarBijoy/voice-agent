from fastapi import APIRouter, WebSocket
from .websocket_handler import VoiceAgentWebSocket

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    handler = VoiceAgentWebSocket(websocket)
    await handler.handle_connection()
