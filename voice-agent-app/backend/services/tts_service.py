import asyncio
import base64
import json
import struct
from datetime import datetime
from pathlib import Path
from typing import Optional

import websockets  # type: ignore[import]

from config import settings


class VogentTTSService:
    def __init__(self) -> None:
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.is_connected = False
        self.generation_id = 0
        self.sample_rate = getattr(settings, "VOGENT_SAMPLE_RATE", 24000)
        self.debug_enabled = getattr(
            settings, "VOGENT_DEBUG_SAVE_AUDIO", False
        )
        self.debug_dir = Path(
            getattr(settings, "VOGENT_DEBUG_AUDIO_DIR", "tts_debug")
        )
        self._debug_frames = bytearray()

    async def connect(self) -> None:
        """Connect to Vogent Voicelab WebSocket."""
        try:
            url = f"{settings.VOGENT_WS_URL}?apiKey={settings.VOGENT_API_KEY}"
            print(f"[TTS] Connecting to: {settings.VOGENT_WS_URL}?apiKey=***")
            self.ws = await websockets.connect(url)
            self.is_connected = True
            print("✅ Connected to Vogent TTS")
        except Exception as exc:
            print(f"❌ Failed to connect to Vogent: {exc}")
            self.is_connected = False
            raise

    async def synthesize_speech(self, text: str, final: bool = False) -> None:
        """Send text for speech synthesis."""
        if not self.ws or not self.is_connected:
            await self.connect()

        self.generation_id += 1
        preview = text[:50].replace("\n", " ")
        message = {
            "generationId": str(self.generation_id),
            "voiceId": settings.VOGENT_VOICE_ID,
            "text": text,
            "finalText": final,
            "sampleRate": self.sample_rate,
            "cancel": False,
        }
        print(
            "[TTS] Sending to Vogent: "
            f"text='{preview}...', final={final}, genId={self.generation_id}"
        )
        await self.ws.send(json.dumps(message))
        print("[TTS] Message sent successfully")

    async def receive_audio(self) -> Optional[dict]:
        """Receive audio chunks from Vogent."""
        if not self.ws or not self.is_connected:
            return None

        try:
            message = await asyncio.wait_for(self.ws.recv(), timeout=10.0)
            data = json.loads(message)
            msg_type = data.get("type")
            gen_id = data.get("generationId")
            print(
                f"[TTS] Received from Vogent: type={msg_type}, "
                f"genId={gen_id}"
            )

            if msg_type == "chunk":
                audio_data = base64.b64decode(data["audio"])
                audio_len = len(audio_data)
                print(f"[TTS] Audio chunk received: {audio_len} bytes")

                if self.debug_enabled:
                    self._debug_frames.extend(audio_data)

                print(
                    "[TTS] Forwarding PCM16 chunk at "
                    f"{self.sample_rate}Hz"
                )
                return {
                    "type": "audio",
                    "data": audio_data,
                    "generation_id": gen_id,
                }

            if msg_type == "finished":
                print("[TTS] Generation finished")
                if self.debug_enabled:
                    self._persist_debug_audio(gen_id)
                return {"type": "complete", "generation_id": gen_id}

            if msg_type == "error":
                error_msg = data.get("error", "Unknown error")
                print(f"[TTS] Error from Vogent: {error_msg}")
                if self.debug_enabled:
                    self._debug_frames.clear()
                return {"type": "error", "error": error_msg}

            if msg_type == "timestamp":
                print(f"[TTS] Timestamp message: {data}")
                return None

            print(f"[TTS] Unknown message type: {msg_type}, data: {data}")
            return None
        except asyncio.TimeoutError:
            print("[TTS] Timeout waiting for Vogent response (10s)")
            return None
        except websockets.exceptions.ConnectionClosedOK:
            print("Vogent TTS connection closed normally")
            self.is_connected = False
            return None
        except websockets.exceptions.ConnectionClosed as exc:
            print(f"Vogent TTS connection closed: {exc}")
            self.is_connected = False
            return None
        except Exception as exc:
            print(f"Error receiving audio: {exc}")
            import traceback

            traceback.print_exc()
            if self.debug_enabled:
                self._debug_frames.clear()
            return None

    def pcm_to_wav(
        self,
        pcm_data: bytes,
        sample_rate: int = 24000,
        channels: int = 1,
        bits_per_sample: int = 16,
    ) -> bytes:
        """Convert raw PCM data to WAV format for browser playback."""
        byte_rate = sample_rate * channels * bits_per_sample // 8
        block_align = channels * bits_per_sample // 8
        data_size = len(pcm_data)
        file_size = 36 + data_size

        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF",
            file_size,
            b"WAVE",
            b"fmt ",
            16,
            1,
            channels,
            sample_rate,
            byte_rate,
            block_align,
            bits_per_sample,
            b"data",
            data_size,
        )
        return header + pcm_data

    async def close(self) -> None:
        """Close WebSocket connection."""
        if self.ws:
            await self.ws.close()
            self.is_connected = False
        if self.debug_enabled:
            self._debug_frames.clear()

    def _persist_debug_audio(self, generation_id: Optional[str]) -> None:
        if not self.debug_enabled or not self._debug_frames:
            return

        try:
            self.debug_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            safe_id = generation_id or str(self.generation_id)
            filename = f"vogent_{safe_id}_{timestamp}.wav"
            path = self.debug_dir / filename
            wav_bytes = self.pcm_to_wav(
                bytes(self._debug_frames),
                sample_rate=self.sample_rate,
                channels=1,
                bits_per_sample=16,
            )
            path.write_bytes(wav_bytes)
            print(f"[TTS] Debug audio saved to {path}")
        except Exception as exc:
            print(f"[TTS] Failed to save debug audio: {exc}")
        finally:
            self._debug_frames.clear()
