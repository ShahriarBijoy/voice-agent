import asyncio
import json
from typing import Optional, Dict, Any
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import WebSocket, WebSocketDisconnect
from services.stt_service import SonioxSTTService
from services.smolagent_service import SmolAgentService
from services.tts_service import VogentTTSService
from models.conversation import ConversationManager
from models.agent_profile import get_agent_profile
from utils.prompt_templates import compose_prompt


class VoiceAgentWebSocket:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.stt_service = SonioxSTTService()
        self.llm_service = SmolAgentService()
        self.tts_service = VogentTTSService()
        self.conversation = ConversationManager()
        self.is_processing = False
        self.shutdown_event = asyncio.Event()
        self.conversation_saved = False
        self.last_conversation_id: Optional[str] = None
        self.agent_profile_id: Optional[str] = None
        self.profile_context: Optional[Dict[str, Any]] = None
        self.tts_start_time: Optional[datetime] = None
        self.processing_start_time: Optional[datetime] = None

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
                    elif data.get("type") == "init":
                        profile_id = data.get("profileId")
                        await self.initialize_profile(profile_id)
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
        start_time = datetime.now()
        self.processing_start_time = start_time
        
        try:
            clean_text = text.replace("<end>", "").replace("<END>", "").strip()
            if not clean_text:
                return

            self.conversation.add_message("user", clean_text)
            await self.websocket.send_json({
                "type": "user_message",
                "text": clean_text
            })

            system_prompt = self.compose_system_prompt()
            full_response = ""
            llm_start = datetime.now()
            
            async for event in self.llm_service.generate_response(
                clean_text, system_prompt
            ):
                if event["type"] == "text":
                    chunk = event["content"]
                    full_response += chunk
                    await self.websocket.send_json(
                        {"type": "assistant_chunk", "text": chunk}
                    )
                elif event["type"] == "error":
                    await self.websocket.send_json(
                        {"type": "error", "message": event["content"]}
                    )
                    return

            llm_time = (datetime.now() - llm_start).total_seconds()
            
            self.conversation.add_message("assistant", full_response)
            
            # Check if event was created/modified and notify frontend
            if any(word in clean_text.lower() for word in 
                   ["add", "create", "schedule", "book", "update", 
                    "change", "modify", "delete", "cancel", "remove"]):
                await self.websocket.send_json({
                    "type": "calendar_refresh"
                })
            
            # Start TTS timing when we initiate synthesis
            if full_response.strip():
                self.tts_start_time = datetime.now()
                await self.tts_service.synthesize_speech(
                    full_response.strip(),
                    final=True
                )
            
            # Calculate total time up to this point (before TTS completes)
            # TTS time will be updated when complete message is received
            total_time = (datetime.now() - start_time).total_seconds()
            
            await self.websocket.send_json({
                "type": "assistant_message",
                "text": full_response,
                "timing": {
                    "llm_time": round(llm_time, 2),
                    "tts_time": 0.0,  # Will be updated when TTS completes
                    "total_time": round(total_time, 2)
                }
            })

        except Exception as e:
            print(f"Processing error: {e}")
            import traceback
            traceback.print_exc()
            await self.websocket.send_json({
                "type": "error",
                "message": str(e)
            })

    async def initialize_profile(self, profile_id: Optional[str]):
        if not profile_id:
            self.profile_context = None
            return

        profile = get_agent_profile(profile_id)
        if not profile:
            await self.websocket.send_json({
                "type": "error",
                "message": "Agent profile not found",
            })
            return

        self.agent_profile_id = profile_id
        self.profile_context = profile.to_dict()
        await self.websocket.send_json({
            "type": "profile_loaded",
            "profile": self.profile_context,
        })

    def compose_system_prompt(self) -> str:
        # Use Central European Time (Berlin timezone)
        cet_tz = ZoneInfo("Europe/Berlin")
        current_time = datetime.now(cet_tz)
        current_time_str = current_time.strftime("%A, %B %d, %Y at %H:%M:%S (Central European Time)")

        if not self.profile_context:
            return compose_prompt(
                current_date_time=current_time_str,
                tone="Warm and professional",
                behavior="General helpful assistant",
                welcome_message="Hello!",
                speaking_style="Balanced",
                tool_context="Appointment Scheduler",
            )

        tool_names = ", ".join(
            [tool["label"] for tool in self.profile_context.get("tools", []) if tool.get("enabled")]
        ) or "No additional tools"
        return compose_prompt(
            current_date_time=current_time_str,
            tone=self.profile_context.get("tone", "Warm"),
            behavior=self.profile_context.get("behavior", ""),
            welcome_message=self.profile_context.get("welcomeMessage", ""),
            speaking_style=self.profile_context.get("speakingStyle", ""),
            tool_context=tool_names,
        )

    async def evaluate_tools(self, user_input: str) -> Optional[Dict[str, Any]]:
        # This method is now obsolete as tool evaluation is handled by the LLM service
        # It can be removed.
        return None

    def extract_name_from_input(self, user_input: str) -> str:
        tokens = user_input.split()
        if len(tokens) >= 2:
            return tokens[-1].strip(".!?")
        return "Patient"

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
                        
                        # Calculate actual TTS time and total time
                        if self.tts_start_time and self.processing_start_time:
                            tts_time = (datetime.now() - self.tts_start_time).total_seconds()
                            # Calculate total time from start_time (when processing began)
                            total_time = (datetime.now() - self.processing_start_time).total_seconds()
                            self.tts_start_time = None  # Reset
                            self.processing_start_time = None  # Reset
                            
                            # Send timing update with actual TTS time and updated total time
                            await self.websocket.send_json({
                                "type": "timing_update",
                                "timing": {
                                    "tts_time": round(tts_time, 2),
                                    "total_time": round(total_time, 2)
                                }
                            })
                        
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
