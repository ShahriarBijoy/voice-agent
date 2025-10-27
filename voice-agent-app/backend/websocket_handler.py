import asyncio
import json
from typing import Optional
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
        self.shutdown_event = asyncio.Event()
        self.conversation_saved = False
        self.last_conversation_id: Optional[str] = None

    async def handle_connection(self):
        """Main WebSocket connection handler"""
        await self.websocket.accept()
        print("WebSocket connection established")
        
        try:
            receive_task = None
            stt_task = None
            tts_task = None

            # Initialize services
            try:
                await self.stt_service.connect()
            except Exception as e:
                print(f"Failed to initialize STT service: {e}")
                await self.websocket.send_json({
                    "type": "error",
                    "message": f"STT service unavailable: {str(e)}"
                })
                return

            try:
                await self.tts_service.connect()
            except Exception as e:
                print(f"Failed to initialize TTS service: {e}")
                await self.websocket.send_json({
                    "type": "error",
                    "message": f"TTS service unavailable: {str(e)}"
                })
                return

            # Send ready message
            await self.websocket.send_json({
                "type": "ready",
                "message": "Voice agent ready"
            })

            # Start service tasks
            receive_task = asyncio.create_task(self.receive_loop(), name="receive_loop")
            stt_task = asyncio.create_task(self.stt_loop(), name="stt_loop")
            tts_task = asyncio.create_task(self.tts_loop(), name="tts_loop")

            # Wait until shutdown is signaled
            await self.shutdown_event.wait()

        except WebSocketDisconnect:
            print("Client disconnected")
            self.signal_shutdown()
        except Exception as e:
            print(f"WebSocket error: {e}")
            import traceback
            traceback.print_exc()
            # Save conversation before cleanup
            await self.save_conversation_and_notify()
            self.signal_shutdown()
        finally:
            # Ensure shutdown event is set to stop background tasks
            self.signal_shutdown()

            tasks = [task for task in (receive_task, stt_task, tts_task) if task is not None]
            for task in tasks:
                task.cancel()

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

            await self.save_conversation_and_notify()
            await self.cleanup()

    async def receive_loop(self):
        """Receive messages from client"""
        while not self.shutdown_event.is_set():
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
                    elif data.get("type") == "disconnect":
                        # Manual disconnect - save conversation and close
                        print("Manual disconnect requested")
                        await self.save_conversation_and_notify()
                        self.signal_shutdown()
                        break
            except Exception as e:
                print(f"Receive error: {e}")
                await self.save_conversation_and_notify()
                self.signal_shutdown()
                break

    async def stt_loop(self):
        """Process STT results - matches Soniox official example"""
        final_tokens = []  # Accumulate final tokens

        while not self.shutdown_event.is_set():
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
                            # Debug: Check if token contains <end> tag
                            if "<end>" in token.get("text", ""):
                                print(f"DEBUG: Found <end> tag in token: "
                                      f"{token}")
                            
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
                    
                    # Remove debugging tags from the text
                    text = (text.replace("<end>", "")
                            .replace("<END>", "").strip())
                    
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
                    final_tokens = []
                    self.signal_shutdown()
                    break
                    
            except Exception as e:
                print(f"STT loop error: {e}")
                import traceback
                traceback.print_exc()
                # Wait and continue
                await asyncio.sleep(1)
                if not self.shutdown_event.is_set():
                    continue
                break

    async def process_user_input(self, text: str):
        """Process user input through LLM and TTS"""
        try:
            # Clean the text by removing debugging tags
            clean_text = (text.replace("<end>", "")
                          .replace("<END>", "").strip())
            
            # Add to conversation
            self.conversation.add_message("user", clean_text)

            # Send to client
            await self.websocket.send_json({
                "type": "user_message",
                "text": clean_text
            })

            # Get LLM response
            system_prompt = get_prompt("default")
            full_response = ""

            # Collect the entire response first
            async for chunk in self.llm_service.generate_response(
                clean_text, system_prompt
            ):
                full_response += chunk
                # Stream LLM chunks to client for display
                await self.websocket.send_json({
                    "type": "assistant_chunk",
                    "text": chunk
                })

            # Add assistant response to conversation
            self.conversation.add_message("assistant", full_response)

            # Send complete assistant message to client
            await self.websocket.send_json({
                "type": "assistant_message",
                "text": full_response
            })

            # Now send the COMPLETE response to TTS as a single message
            # This avoids confusing Vogent with multiple generation IDs
            if full_response.strip():
                print(f"[TTS] Sending complete response to Vogent: {len(full_response)} chars")
                await self.tts_service.synthesize_speech(
                    full_response.strip(),
                    final=True
                )

        except Exception as e:
            print(f"Processing error: {e}")
            import traceback
            traceback.print_exc()
            await self.websocket.send_json({
                "type": "error",
                "message": str(e)
            })

    async def tts_loop(self):
        """Receive and forward TTS audio"""
        while not self.shutdown_event.is_set():
            try:
                result = await self.tts_service.receive_audio()
                if result:
                    if result["type"] == "audio":
                        # Forward audio to client
                        audio_data = result['data']
                        print(f"[WS] 🎵 Received {len(audio_data)} bytes from TTS")
                        print(f"[WS] First 4 bytes (RIFF header): {audio_data[:4]}")
                        await self.websocket.send_bytes(audio_data)
                        print(f"[WS] ✅ Forwarded {len(audio_data)} bytes to client")
                    elif result["type"] == "complete":
                        print(f"[WS] TTS generation complete, sending tts_complete")
                        await self.websocket.send_json({
                            "type": "tts_complete"
                        })
                    elif result["type"] == "error":
                        print(f"[WS] ❌ TTS error: {result['error']}")
                        await self.websocket.send_json({
                            "type": "error",
                            "message": f"TTS Error: {result['error']}"
                        })
                else:
                    # Timeout or connection issue, continue waiting
                    print("[WS] TTS returned None (timeout or connection issue), continuing...")
                    await asyncio.sleep(0.1)
            except Exception as e:
                print(f"❌ TTS loop error: {e}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(0.5)
                continue

            if self.shutdown_event.is_set():
                break

    async def save_conversation_and_notify(self):
        """Save conversation and notify client if possible"""
        if self.conversation_saved:
            return self.last_conversation_id

        conversation_id = self.conversation.save_conversation()
        if conversation_id:
            self.conversation_saved = True
            self.last_conversation_id = conversation_id
            print(f"Conversation saved with ID: {conversation_id}")
            try:
                # Check if WebSocket is still open before sending
                if (hasattr(self.websocket, 'client_state') and 
                    self.websocket.client_state.name == 'CONNECTED'):
                    await self.websocket.send_json({
                        "type": "conversation_saved",
                        "conversation_id": conversation_id
                    })
                    print("Conversation saved notification sent successfully")
                else:
                    print("WebSocket already closed, skipping notification")
            except Exception as e:
                print(f"Failed to send conversation_saved message: {e}")
        return conversation_id

    def signal_shutdown(self):
        """Signal background tasks to shut down"""
        if not self.shutdown_event.is_set():
            self.shutdown_event.set()

    async def cleanup(self):
        """Clean up resources"""
        await self.stt_service.close()
        await self.tts_service.close()
