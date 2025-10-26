from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from websocket_handler import VoiceAgentWebSocket

app = FastAPI(title="Voice Agent API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Voice Agent API",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    handler = VoiceAgentWebSocket(websocket)
    await handler.handle_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
