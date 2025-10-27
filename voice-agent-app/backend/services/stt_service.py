import json
import websockets


from config import settings


class SonioxSTTService:
    def __init__(self):
        self.ws = None
        self.is_connected = False

    async def connect(self):
        """Establish WebSocket connection to Soniox"""
        try:
            # Connect to Soniox WebSocket
            self.ws = await websockets.connect(settings.SONIOX_WS_URL)
            
            # Send configuration as first message
            config = {
                "api_key": settings.SONIOX_API_KEY,
                "model": "stt-rt-preview",  # Correct model name per Soniox docs
                # Raw audio format configuration
                # 16-bit signed PCM, little-endian
                "audio_format": "pcm_s16le",
                "sample_rate": 16000,
                "num_channels": 1,  # Mono audio
                # Enable non-final tokens for real-time feedback
                "include_nonfinal": True,
                # Enable endpoint detection to automatically finalize
                # when speaker stops talking (VAD)
                "enable_endpoint_detection": True,
                # Disable any debugging tags
                "include_debug_info": False
            }
            
            # Send config as first message
            await self.ws.send(json.dumps(config))
            self.is_connected = True
            print(f"Connected to Soniox STT with config: {config}")
            
        except Exception as e:
            print(f"Failed to connect to Soniox: {e}")
            self.is_connected = False
            raise

    async def send_audio(self, audio_chunk: bytes):
        """Send audio chunk to Soniox (raw PCM Int16)"""
        if self.ws and self.is_connected:
            # Soniox expects raw binary PCM data
            await self.ws.send(audio_chunk)

    async def receive_transcript(self):
        """Receive transcription results"""
        if self.ws and self.is_connected:
            try:
                message = await self.ws.recv()
                result = json.loads(message)
                print(f"STT received: {result}")  # Debug log
                return result
            except websockets.exceptions.ConnectionClosedOK:
                print("Soniox STT connection closed normally")
                self.is_connected = False
                return None
            except websockets.exceptions.ConnectionClosed as e:
                print(f"Soniox STT connection closed: {e}")
                self.is_connected = False
                return None
            except Exception as e:
                print(f"Error receiving transcript: {e}")
                return None
        return None

    async def finalize(self):
        """Signal end of audio stream"""
        if self.ws and self.is_connected:
            # Send empty string to signal end-of-audio to Soniox
            await self.ws.send("")

    async def close(self):
        """Close WebSocket connection"""
        if self.ws:
            await self.ws.close()
            self.is_connected = False
