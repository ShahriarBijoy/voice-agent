"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, Eraser } from "lucide-react"

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
import {
  Message as MessageType,
  ConnectionState,
  RecordingState,
  WebSocketMessage,
} from "@/lib/types"
import { VoiceAgentWebSocket } from "@/lib/websocket-client"
import { AudioProcessor, AudioPlayer } from "@/lib/audio-processor"

export function VoiceChat() {
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

  const wsRef = useRef<VoiceAgentWebSocket | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)

  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer()

    return () => {
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

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const message: MessageType = {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
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
          }
          break
        case "tts_complete":
          setRecordingState(RecordingState.IDLE)
          setAgentState("listening")
          break
        case "error":
          console.error("Error:", message.message)
          setRecordingState(RecordingState.IDLE)
          setAgentState(null)
          break
        case "cleared":
          setMessages([])
          setAgentState("listening")
          break
      }
    },
    [addMessage]
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
      console.log("[VoiceChat] Starting recording...")
      setAgentState("listening")
      
      if (!wsRef.current?.isConnected()) {
        console.log("[VoiceChat] Not connected, connecting first...")
        await connect()
      }

      const ws = wsRef.current?.getWebSocket()
      if (!ws) {
        throw new Error("WebSocket not available")
      }

      console.log("[VoiceChat] Initializing audio processor...")
      audioProcessorRef.current = new AudioProcessor()
      await audioProcessorRef.current.initialize(ws)
      console.log("[VoiceChat] Audio processor initialized")
      setRecordingState(RecordingState.RECORDING)
    } catch (error) {
      console.error("[VoiceChat] Failed to start recording:", error)
      alert("Failed to access microphone. Please check permissions.")
      setAgentState(null)
    }
  }

  const stopRecording = () => {
    audioProcessorRef.current?.finalize()
    audioProcessorRef.current?.stopRecording()
    setRecordingState(RecordingState.IDLE)
  }

  const disconnect = () => {
    if (recordingState === RecordingState.RECORDING) {
      stopRecording()
    }
    wsRef.current?.disconnect()
    setConnectionState(ConnectionState.DISCONNECTED)
    setAgentState(null)
  }

  const clearConversation = () => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send(JSON.stringify({ type: "clear" }))
    }
    setMessages([])
  }

  const handleStartOrEnd = () => {
    if (
      connectionState === ConnectionState.CONNECTED &&
      recordingState === RecordingState.RECORDING
    ) {
      stopRecording()
      disconnect()
    } else if (connectionState === ConnectionState.DISCONNECTED) {
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
        <Conversation className="h-full">
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
    </div>
  )
}
