import asyncio
import json
import websockets
import base64
import struct
from config import settings

class VogentTTSService:
    def __init__(self):
        self.ws = None
        self.is_connected = False
        self.generation_id = 0

    async def connect(self):
        """Connect to Vogent Voicelab WebSocket"""
        try:
            # Use API key in URL as per official Vogent docs
            url = f"{settings.VOGENT_WS_URL}?apiKey={settings.VOGENT_API_KEY}"
            print(f"[TTS] Connecting to: {settings.VOGENT_WS_URL}?apiKey=***")
            
            self.ws = await websockets.connect(url)
            self.is_connected = True
            print("✅ Connected to Vogent TTS")
        except Exception as e:
            print(f"❌ Failed to connect to Vogent: {e}")
            self.is_connected = False
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
        print(f"[TTS] Sending to Vogent: text='{text[:50]}...', final={final}, genId={self.generation_id}")
        await self.ws.send(json.dumps(message))
        print(f"[TTS] Message sent successfully")

    async def receive_audio(self):
        """Receive audio chunks from Vogent"""
        if self.ws and self.is_connected:
            try:
                # Add timeout to prevent blocking forever
                message = await asyncio.wait_for(self.ws.recv(), timeout=10.0)
                data = json.loads(message)

                msg_type = data.get("type")
                print(f"[TTS] Received from Vogent: type={msg_type}, genId={data.get('generationId')}")

                if msg_type == "chunk":
                    # Audio is base64 encoded PCM data
                    audio_data = base64.b64decode(data["audio"])
                    print(f"[TTS] Audio chunk received: {len(audio_data)} bytes")
                    
                    # Convert raw PCM to WAV format for browser compatibility
                    wav_data = self.pcm_to_wav(audio_data, sample_rate=24000, channels=1, bits_per_sample=16)
                    print(f"[TTS] Converted to WAV: {len(wav_data)} bytes (added {len(wav_data)-len(audio_data)} byte header)")
                    
                    return {
                        "type": "audio",
                        "data": wav_data,
                        "generation_id": data["generationId"]
                    }
                elif msg_type == "finished":
                    print(f"[TTS] Generation finished")
                    return {
                        "type": "complete",
                        "generation_id": data["generationId"]
                    }
                elif msg_type == "error":
                    error_msg = data.get("error", "Unknown error")
                    print(f"[TTS] Error from Vogent: {error_msg}")
                    return {
                        "type": "error",
                        "error": error_msg
                    }
                else:
                    print(f"[TTS] Unknown message type: {msg_type}, data: {data}")
            except asyncio.TimeoutError:
                print("[TTS] Timeout waiting for Vogent response (10s)")
                return None
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
                import traceback
                traceback.print_exc()
                return None

    def pcm_to_wav(self, pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, bits_per_sample: int = 16) -> bytes:
        """Convert raw PCM data to WAV format for browser compatibility"""
        # WAV file header
        byte_rate = sample_rate * channels * bits_per_sample // 8
        block_align = channels * bits_per_sample // 8
        data_size = len(pcm_data)
        file_size = 36 + data_size
        
        # Create WAV header
        header = struct.pack('<4sI4s4sIHHIIHH4sI',
            b'RIFF',           # Chunk ID
            file_size,         # File size
            b'WAVE',           # Format
            b'fmt ',           # Subchunk1 ID
            16,                # Subchunk1 size (PCM)
            1,                 # Audio format (PCM)
            channels,          # Number of channels
            sample_rate,       # Sample rate
            byte_rate,         # Byte rate
            block_align,       # Block align
            bits_per_sample,   # Bits per sample
            b'data',           # Subchunk2 ID
            data_size          # Subchunk2 size
        )
        
        return header + pcm_data

    async def close(self):
        """Close WebSocket connection"""
        if self.ws:
            await self.ws.close()
            self.is_connected = False
