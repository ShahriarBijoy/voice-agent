from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from websocket_handler import VoiceAgentWebSocket
from api import agents, calendar, conversations
from agents import initialize_tools

app = FastAPI()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "voice-agent-backend"}


@app.on_event("startup")
async def startup_event():
    initialize_tools()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3006",
        "https://voice-agent-frontend.onrender.com",
        "https://voice-agent-backend.onrender.com",
        "https://voice-agent-frontend-3xd6.onrender.com",
        "https://voice-agent-backend-3v6s.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    handler = VoiceAgentWebSocket(websocket)
    await handler.handle_connection()

app.include_router(conversations.router, tags=["conversations"])
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(calendar.router, tags=["calendar"])

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
