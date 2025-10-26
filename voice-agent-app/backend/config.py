import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # API Keys
    SONIOX_API_KEY = os.getenv("SONIOX_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-nano")
    VOGENT_API_KEY = os.getenv("VOGENT_API_KEY")
    VOGENT_VOICE_ID = os.getenv("VOGENT_VOICE_ID")
    
    # Server Config
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://localhost:3006"
    ).split(",")
    
    # WebSocket URLs
    SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket"
    VOGENT_WS_URL = "wss://api.vogent.ai/api/tts/websocket"


settings = Settings()
