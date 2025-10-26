import asyncio
import json
import websockets
import base64
from config import settings

class VogentTTSService:
    def __init__(self):
        self.ws = None
        self.is_connected = False
        self.generation_id = 0

    async def connect(self):
        """Connect to Vogent Voicelab WebSocket"""
        try:
            headers = {
                "Authorization": f"Bearer {settings.VOGENT_API_KEY}"
            }
            self.ws = await websockets.connect(
                settings.VOGENT_WS_URL,
                extra_headers=headers
            )
            self.is_connected = True
            print("Connected to Vogent TTS")
        except Exception as e:
            print(f"Failed to connect to Vogent: {e}")
            raise

    async def synthesize_speech(self, text: str, final: bool = False):
        """Send text for speech synthesis"""
        if not self.ws or not self.is_connected:
            await self.connect()
        
        self.generation_id += 1
        message = {
            "generationId": str(self.generation_id),
            "voiceId": settings.VOGENT_VOICE_ID,
            "text": text,
            "finalText": final,
            "sampleRate": 24000
        }
        await self.ws.send(json.dumps(message))

    async def receive_audio(self):
        """Receive audio chunks from Vogent"""
        if self.ws and self.is_connected:
            try:
                message = await self.ws.recv()
                data = json.loads(message)
                
                msg_type = data.get("type")
                
                if msg_type == "chunk":
                    # Audio is base64 encoded
                    audio_data = base64.b64decode(data["audio"])
                    return {
                        "type": "audio",
                        "data": audio_data,
                        "generation_id": data["generationId"]
                    }
                elif msg_type == "finished":
                    return {
                        "type": "complete",
                        "generation_id": data["generationId"]
                    }
                elif msg_type == "error":
                    return {
                        "type": "error",
                        "error": data.get("error", "Unknown error")
                    }
            except websockets.exceptions.ConnectionClosedOK:
                print("Vogent TTS connection closed normally")
                self.is_connected = False
                return None
            except websockets.exceptions.ConnectionClosed as e:
                print(f"Vogent TTS connection closed: {e}")
                self.is_connected = False
                return None
            except Exception as e:
                print(f"Error receiving audio: {e}")
                return None

    async def close(self):
        """Close WebSocket connection"""
        if self.ws:
            await self.ws.close()
            self.is_connected = False
