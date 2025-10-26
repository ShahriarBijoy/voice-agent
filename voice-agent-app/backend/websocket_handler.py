import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
from services.stt_service import SonioxSTTService
from services.llm_service import LLMService
from services.tts_service import VogentTTSService
from models.conversation import ConversationManager
from utils.prompt_templates import get_prompt


class VoiceAgentWebSocket:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.stt_service = SonioxSTTService()
        self.llm_service = LLMService()
        self.tts_service = VogentTTSService()
        self.conversation = ConversationManager()
        self.is_processing = False

    async def handle_connection(self):
        """Main WebSocket connection handler"""
        await self.websocket.accept()
        print("WebSocket connection established")
        
        try:
            # Initialize services
            await self.stt_service.connect()
            await self.tts_service.connect()
            
            # Send ready message
            await self.websocket.send_json({
                "type": "ready",
                "message": "Voice agent ready"
            })
            
            # Start receiving tasks
            receive_task = asyncio.create_task(self.receive_loop())
            stt_task = asyncio.create_task(self.stt_loop())
            tts_task = asyncio.create_task(self.tts_loop())
            
            # Wait for any task to complete
            done, pending = await asyncio.wait(
                [receive_task, stt_task, tts_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                
        except WebSocketDisconnect:
            print("Client disconnected")
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            await self.cleanup()

    async def receive_loop(self):
        """Receive messages from client"""
        while True:
            try:
                message = await self.websocket.receive()
                
                if "bytes" in message:
                    # Audio data from client
                    await self.stt_service.send_audio(message["bytes"])
                elif "text" in message:
                    # JSON message from client
                    data = json.loads(message["text"])
                    if data.get("type") == "finalize":
                        await self.stt_service.finalize()
                    elif data.get("type") == "clear":
                        self.conversation.clear()
                        self.llm_service.clear_history()
                        await self.websocket.send_json({
                            "type": "cleared",
                            "message": "Conversation cleared"
                        })
            except Exception as e:
                print(f"Receive error: {e}")
                break

    async def stt_loop(self):
        """Process STT results - matches Soniox official example"""
        final_tokens = []  # Accumulate final tokens
        
        while True:
            try:
                result = await self.stt_service.receive_transcript()
                
                # Skip if no result (connection closed, etc.)
                if not result:
                    print("STT result is None, continuing...")
                    continue
                
                # Check for error from server
                if result.get("error_code") is not None:
                    error_msg = (
                        f"Error: {result['error_code']} - "
                        f"{result['error_message']}"
                    )
                    print(error_msg)
                    await self.websocket.send_json({
                        "type": "error",
                        "message": error_msg
                    })
                    break
                
                # Parse tokens from current response
                non_final_tokens = []
                if "tokens" in result:
                    for token in result["tokens"]:
                        if token.get("text"):
                            if token.get("is_final"):
                                # Final tokens are returned once
                                # Append to final_tokens
                                final_tokens.append(token)
                            else:
                                # Non-final tokens update as more audio arrives
                                non_final_tokens.append(token)
                
                # Build full transcript from final + non-final tokens
                all_tokens = final_tokens + non_final_tokens
                if all_tokens:
                    # Get text from all tokens in order
                    # Join tokens directly without adding extra spaces
                    # Tokens already include spaces as separate tokens
                    text = "".join([t["text"] for t in all_tokens])
                    # Check if we have any non-final tokens
                    has_non_final = len(non_final_tokens) > 0
                    
                    print(f"STT: '{text}' "
                          f"(has_non_final: {has_non_final})")
                    
                    # Send partial transcript to client
                    await self.websocket.send_json({
                        "type": "transcript",
                        "text": text,
                        "is_final": not has_non_final
                    })
                    
                    # Process ONLY when we have final text
                    # and no non-final tokens
                    if not has_non_final and text.strip():
                        if not self.is_processing:
                            self.is_processing = True
                            print(f"Processing final input: {text}")
                            # Clear final_tokens after processing
                            final_tokens = []
                            await self.process_user_input(text)
                            self.is_processing = False
                
                # Check if session is finished
                if result.get("finished"):
                    print("Session finished.")
                    break
                    
            except Exception as e:
                print(f"STT loop error: {e}")
                import traceback
                traceback.print_exc()
                # Wait and continue
                await asyncio.sleep(1)

    async def process_user_input(self, text: str):
        """Process user input through LLM and TTS"""
        try:
            # Add to conversation
            self.conversation.add_message("user", text)
            
            # Send to client
            await self.websocket.send_json({
                "type": "user_message",
                "text": text
            })
            
            # Get LLM response
            system_prompt = get_prompt("default")
            full_response = ""
            async for chunk in self.llm_service.generate_response(
                text, system_prompt
            ):
                full_response += chunk
                
                # Send chunk to TTS when we have enough text
                if len(full_response) >= 50 or chunk.endswith((".", "!", "?")):
                    await self.tts_service.synthesize_speech(full_response, final=False)
                    full_response = ""
            
            # Send final text to TTS
            if full_response:
                await self.tts_service.synthesize_speech(full_response, final=True)
                
        except Exception as e:
            print(f"Processing error: {e}")
            await self.websocket.send_json({
                "type": "error",
                "message": str(e)
            })

    async def tts_loop(self):
        """Receive and forward TTS audio"""
        while True:
            try:
                result = await self.tts_service.receive_audio()
                if result:
                    if result["type"] == "audio":
                        # Forward audio to client
                        await self.websocket.send_bytes(result["data"])
                    elif result["type"] == "complete":
                        await self.websocket.send_json({
                            "type": "tts_complete"
                        })
                    elif result["type"] == "error":
                        await self.websocket.send_json({
                            "type": "error",
                            "message": result["error"]
                        })
            except Exception as e:
                print(f"TTS loop error: {e}")
                break

    async def cleanup(self):
        """Clean up resources"""
        await self.stt_service.close()
        await self.tts_service.close()
