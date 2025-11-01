from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from websocket_handler import VoiceAgentWebSocket
from api import agents, calendar, conversations
from agents import initialize_tools

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    initialize_tools()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
