"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, Eraser } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card } from "@/components/ui/card"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { Message as MessageComponent } from "@/components/ui/message"
import { MicSelector } from "@/components/ui/mic-selector"
import { Orb, AgentState } from "@/components/ui/orb"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { showSessionSavedToast } from "@/components/ui/session-saved-notification"
import {
  Message as MessageType,
  ConnectionState,
  RecordingState,
  WebSocketMessage,
} from "@/lib/types"
import { VoiceAgentWebSocket } from "@/lib/websocket-client"
import { AudioProcessor, AudioPlayer } from "@/lib/audio-processor"

export function VoiceChat() {
  const router = useRouter()
  const [messages, setMessages] = useState<MessageType[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  )
  const [recordingState, setRecordingState] = useState<RecordingState>(
    RecordingState.IDLE
  )
  const [currentTranscript, setCurrentTranscript] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>(null)
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>("")
  const [idleTimeoutWarning, setIdleTimeoutWarning] = useState<boolean>(false)
  const [assistantStream, setAssistantStream] = useState<string>("")

  const wsRef = useRef<VoiceAgentWebSocket | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const idleWarningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer()

    return () => {
      // Clear idle timeouts manually
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
      if (idleWarningTimeoutRef.current) {
        clearTimeout(idleWarningTimeoutRef.current)
      }
      
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopRecording()
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop()
      }
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
    }
  }, [])

  // Idle timeout management
  const resetIdleTimeout = useCallback(() => {
    // Clear existing timeouts
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }
    if (idleWarningTimeoutRef.current) {
      clearTimeout(idleWarningTimeoutRef.current)
    }
    setIdleTimeoutWarning(false)

    // Only set timeout if we're connected and recording
    if (connectionState === ConnectionState.CONNECTED && recordingState === RecordingState.RECORDING) {
      // Show warning after 1.5 minutes (90 seconds)
      idleWarningTimeoutRef.current = setTimeout(() => {
        setIdleTimeoutWarning(true)
      }, 90 * 1000)

      // Auto-disconnect after 2 minutes (120 seconds)
      idleTimeoutRef.current = setTimeout(() => {
        console.log("[VoiceChat] Idle timeout reached, disconnecting session")
        setIdleTimeoutWarning(false)
        
        // Direct disconnect logic to avoid dependency issues
        if (recordingState === RecordingState.RECORDING) {
          stopRecording()
        }
        
        if (audioProcessorRef.current) {
          audioProcessorRef.current.stopRecording()
          audioProcessorRef.current = null
        }
        
        wsRef.current?.disconnect()
        setConnectionState(ConnectionState.DISCONNECTED)
        setAgentState(null)
        setRecordingState(RecordingState.IDLE)
      }, 120 * 1000)
    }
  }, [connectionState, recordingState])

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    if (idleWarningTimeoutRef.current) {
      clearTimeout(idleWarningTimeoutRef.current)
      idleWarningTimeoutRef.current = null
    }
    setIdleTimeoutWarning(false)
  }, [])

  // Reset idle timeout when user activity is detected
  useEffect(() => {
    if (currentTranscript || messages.length > 0) {
      resetIdleTimeout()
    }
  }, [currentTranscript, messages.length, resetIdleTimeout])

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const message: MessageType = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role,
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
    },
    []
  )

  const handleViewHistory = useCallback(() => {
    router.push("/history")
  }, [router])

  const resetConversationUI = useCallback(
    (options: { variant?: "clear" | "saved" } = {}) => {
      setMessages([])
      setCurrentTranscript("")
      setAssistantStream("")
      if (options.variant === "saved") {
        setAgentState(null)
        return
      }
      setAgentState("listening")
    },
    []
  )

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      console.log("Received message:", message)

      switch (message.type) {
        case "ready":
          console.log("Voice agent ready")
          setAgentState("listening")
          setRecordingState(RecordingState.RECORDING)
          break
        case "transcript":
          if (message.text) {
            setCurrentTranscript(message.text)
            if (message.is_final) {
              setCurrentTranscript("")
              setAgentState("thinking")
            }
          }
          break
        case "user_message":
          if (message.text) {
            addMessage("user", message.text)
            setRecordingState(RecordingState.PROCESSING)
            setAgentState("thinking")
            setAssistantStream("")
          }
          break
        case "assistant_chunk":
          if (message.text) {
            setAssistantStream((prev) => prev + message.text)
            setAgentState("talking")
          }
          break
        case "assistant_message":
          if (message.text) {
            setAssistantStream("")
            addMessage("assistant", message.text)
            setAgentState("listening")
            setRecordingState(RecordingState.RECORDING)
          }
          break
        case "tts_complete":
          // Don't change recording state - keep the session active
          setAgentState("listening")
          setRecordingState(RecordingState.RECORDING)
          break
        case "error":
          console.error("Error:", message.message)
          setRecordingState(RecordingState.IDLE)
          setAgentState(null)
          break
        case "cleared":
          resetConversationUI({ variant: "clear" })
          break
        case "conversation_saved":
          if (message.conversation_id) {
            showSessionSavedToast({
              conversationId: message.conversation_id,
              onViewHistory: handleViewHistory,
            })
            resetConversationUI({ variant: "saved" })
          }
          break
      }
    },
    [addMessage, handleViewHistory, resetConversationUI]
  )

  const handleAudio = useCallback((data: ArrayBuffer) => {
    audioPlayerRef.current?.playAudio(data)
  }, [])

  const connect = async () => {
    try {
      console.log("[VoiceChat] Connecting to WebSocket...")
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws"
      wsRef.current = new VoiceAgentWebSocket(
        wsUrl,
        handleMessage,
        handleAudio,
        setConnectionState
      )
      await wsRef.current.connect()
      console.log("[VoiceChat] Connected successfully")
    } catch (error) {
      console.error("[VoiceChat] Failed to connect:", error)
      setConnectionState(ConnectionState.ERROR)
    }
  }

  const startRecording = async () => {
    try {
      console.log("[VoiceChat] Starting recording...", { 
        connectionState, 
        recordingState, 
        isConnected: wsRef.current?.isConnected() 
      })
      setAgentState("listening")
      
      if (!wsRef.current?.isConnected()) {
        console.log("[VoiceChat] Not connected, connecting first...")
        await connect()
      }

      const ws = wsRef.current?.getWebSocket()
      if (!ws) {
        throw new Error("WebSocket not available")
      }

      // Only initialize audio processor if it doesn't exist or is not active
      if (!audioProcessorRef.current || !audioProcessorRef.current.isRecording()) {
        console.log("[VoiceChat] Initializing audio processor...")
        audioProcessorRef.current = new AudioProcessor()
        await audioProcessorRef.current.initialize(ws, selectedMicDevice)
        console.log("[VoiceChat] Audio processor initialized")
      }
      
      console.log("[VoiceChat] Setting recording state to RECORDING")
      setRecordingState(RecordingState.RECORDING)
      
      // Start idle timeout when recording starts
      setTimeout(() => resetIdleTimeout(), 100)
    } catch (error) {
      console.error("[VoiceChat] Failed to start recording:", error)
      alert("Failed to access microphone. Please check permissions.")
      setAgentState(null)
      setRecordingState(RecordingState.IDLE)
    }
  }

  const stopRecording = () => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.finalize()
      audioProcessorRef.current.stopRecording()
      // Don't null the reference here - keep it for potential reuse
    }
    setRecordingState(RecordingState.IDLE)
  }

  const disconnect = useCallback(async () => {
    if (recordingState === RecordingState.RECORDING) {
      stopRecording()
    }
    
    // Send disconnect message to backend before closing WebSocket
    if (wsRef.current?.isConnected()) {
      wsRef.current.send(JSON.stringify({ type: "disconnect" }))
    }
    
    // Properly clean up audio processor when disconnecting
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stopRecording()
      audioProcessorRef.current = null
    }
    
    await wsRef.current?.disconnect(1000)
    setConnectionState(ConnectionState.DISCONNECTED)
    setAgentState(null)
    setRecordingState(RecordingState.IDLE)
    resetConversationUI({ variant: "clear" })
  }, [recordingState, resetConversationUI])

  const disconnectWithCleanup = () => {
    // Clear idle timeout when disconnecting
    clearIdleTimeout()
    disconnect()
  }

  const clearConversation = () => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send(JSON.stringify({ type: "clear" }))
    }
    resetConversationUI()
  }

  const handleStartOrEnd = () => {
    console.log("[VoiceChat] Button clicked", { connectionState, recordingState })
    if (
      connectionState === ConnectionState.CONNECTED &&
      recordingState === RecordingState.RECORDING
    ) {
      // Stop recording and disconnect the session
      console.log("[VoiceChat] Stopping session")
      stopRecording()
      disconnectWithCleanup()
    } else if (connectionState === ConnectionState.CONNECTED && recordingState === RecordingState.IDLE) {
      // Start recording in existing session
      console.log("[VoiceChat] Starting recording in existing session")
      startRecording()
    } else if (connectionState === ConnectionState.DISCONNECTED) {
      // Start new session
      console.log("[VoiceChat] Starting new session")
      startRecording()
    }
  }

  const isConnected = connectionState === ConnectionState.CONNECTED
  const isRecording = recordingState === RecordingState.RECORDING
  const hasStarted = messages.length > 0

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <AnimatePresence>
        {hasStarted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 80, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="border-b"
          >
            <div className="flex items-center gap-3 h-20 px-4">
              <div className="w-16 h-16 shrink-0">
                <Orb agentState={agentState} />
              </div>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-semibold"
              >
                Voice Agent
              </motion.h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full" >
          <ConversationContent className="flex min-w-0 flex-col gap-4 p-6">
            {!hasStarted ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center space-y-6">
                  <div className="w-64 h-64">
                    <Orb agentState={agentState} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium">Start a Conversation</h3>
                    <p className="text-muted-foreground text-sm">
                      Click the start button below to begin
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageComponent
                    key={message.id}
                    content={message.content}
                    source={message.role === "user" ? "user" : "ai"}
                    avatar={message.role === "user" ? "You" : "AI"}
                  />
                ))}
                {currentTranscript && (
                  <div className="text-muted-foreground text-sm italic">
                    &ldquo;{currentTranscript}&rdquo;
                  </div>
                )}
                {assistantStream && (
                  <MessageComponent
                    key="assistant-stream"
                    content={assistantStream}
                    source="ai"
                    avatar="AI"
                  />
                )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Conversation Bar */}
      <div className="flex w-full items-end justify-center p-4">
        <Card className="m-0 w-full max-w-4xl gap-0 border p-0 shadow-lg">
          <div className="flex items-center justify-between gap-2 p-2">
            {/* Waveform Display */}
            <div className="h-8 w-[120px] md:h-10">
              <div
                className={cn(
                  "flex h-full items-center gap-2 rounded-md py-1",
                  "bg-foreground/5 text-foreground/70"
                )}
              >
                <div className="h-full flex-1">
                  <div
                    className={cn(
                      "relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-sm"
                    )}
                  >
                    <LiveWaveform
                      key={isConnected ? "active" : "idle"}
                      active={isRecording && !isMuted}
                      processing={
                        connectionState === ConnectionState.CONNECTING
                      }
                      deviceId={selectedMicDevice}
                      barWidth={3}
                      barGap={1}
                      barRadius={4}
                      fadeEdges={true}
                      fadeWidth={24}
                      sensitivity={1.8}
                      smoothingTimeConstant={0.85}
                      height={20}
                      mode="static"
                      className={cn(
                        "h-full w-full transition-opacity duration-300",
                        !isConnected && "opacity-0"
                      )}
                    />
                    {!isConnected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-foreground/50 text-[10px] font-medium">
                          Voice Agent
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              {/* Mic Selector */}
              <MicSelector
                value={selectedMicDevice}
                onValueChange={setSelectedMicDevice}
                muted={isMuted}
                onMutedChange={setIsMuted}
                disabled={isRecording}
              />

              {/* Button Group for Clear and Start/Stop */}
              <ButtonGroup orientation="horizontal">
                <Tooltip>
                  <TooltipTrigger
                    variant="ghost"
                    size="icon"
                    onClick={clearConversation}
                    disabled={messages.length === 0}
                  >
                    <Eraser className="h-5 w-5" />
                  </TooltipTrigger>
                  <TooltipContent>Clear conversation</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    variant="ghost"
                    size="icon"
                    onClick={handleStartOrEnd}
                    disabled={connectionState === ConnectionState.CONNECTING}
                  >
                    {isConnected && isRecording ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {isConnected && isRecording ? "Stop conversation" : "Start conversation"}
                  </TooltipContent>
                </Tooltip>
              </ButtonGroup>
            </div>
          </div>
        </Card>
      </div>

      {/* Idle Timeout Warning */}
      {idleTimeoutWarning && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                Session will end in 30 seconds due to inactivity
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
