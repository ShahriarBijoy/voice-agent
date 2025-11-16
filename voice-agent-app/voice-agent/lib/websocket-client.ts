import { ConnectionState, WebSocketMessage } from "./types"

export class VoiceAgentWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private onMessage: (message: WebSocketMessage) => void
  private onAudio: (data: ArrayBuffer) => void
  private onConnectionStateChange: (state: ConnectionState) => void
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private manualClose = false

  constructor(
    url: string,
    onMessage: (message: WebSocketMessage) => void,
    onAudio: (data: ArrayBuffer) => void,
    onConnectionStateChange: (state: ConnectionState) => void
  ) {
    this.url = url
    this.onMessage = onMessage
    this.onAudio = onAudio
    this.onConnectionStateChange = onConnectionStateChange
  }

  async connect(): Promise<void> {
    this.manualClose = false
    return new Promise((resolve, reject) => {
      try {
        this.onConnectionStateChange(ConnectionState.CONNECTING)
  this.ws = new WebSocket(this.url)
  this.ws.binaryType = "arraybuffer"

        this.ws.onopen = () => {
          console.log("[WebSocket] Connected")
          this.onConnectionStateChange(ConnectionState.CONNECTED)
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = async (event) => {
          try {
            console.log("[WebSocket] Received message, data type:", typeof event.data, "is Blob:", event.data instanceof Blob, "is ArrayBuffer:", event.data instanceof ArrayBuffer)
            
            if (event.data instanceof Blob) {
              // Audio data
              console.log("[WebSocket] 🎵 Received blob audio data:", event.data.size, "bytes")
              const arrayBuffer = await event.data.arrayBuffer()
              console.log("[WebSocket] ✅ Converted to ArrayBuffer:", arrayBuffer.byteLength, "bytes")
              this.onAudio(arrayBuffer)
            } else if (event.data instanceof ArrayBuffer) {
              // Audio data as ArrayBuffer
              console.log("[WebSocket] 🎵 Received ArrayBuffer audio data:", event.data.byteLength, "bytes")
              this.onAudio(event.data)
            } else if (typeof event.data === 'string') {
              // JSON message
              try {
                const message = JSON.parse(event.data) as WebSocketMessage
                console.log("[WebSocket] 📝 Received JSON message:", message.type)
                this.onMessage(message)
              } catch (error) {
                console.error("[WebSocket] Failed to parse JSON message:", error, "raw data:", event.data.substring(0, 100))
              }
            } else {
              console.warn("[WebSocket] Unknown message type:", typeof event.data, event.data)
            }
          } catch (error) {
            console.error("[WebSocket] Error in onmessage:", error)
          }
        }

        this.ws.onerror = (error) => {
          console.error("[WebSocket] Error:", error)
          this.onConnectionStateChange(ConnectionState.ERROR)
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log("[WebSocket] Closed:", event.code, event.reason)
          this.onConnectionStateChange(ConnectionState.DISCONNECTED)

          const shouldReconnect =
            !this.manualClose &&
            !event.wasClean &&
            this.reconnectAttempts < this.maxReconnectAttempts

          if (shouldReconnect) {
            this.reconnectAttempts++
            console.log(
              `[WebSocket] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
            )
            setTimeout(() => {
              this.connect().catch(console.error)
            }, this.reconnectDelay * this.reconnectAttempts)
          }

          this.ws = null
        }
      } catch (error) {
        this.onConnectionStateChange(ConnectionState.ERROR)
        reject(error)
      }
    })
  }

  send(data: string | ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    } else {
      console.warn("[WebSocket] Cannot send, connection not open")
    }
  }

  async disconnect(gracefulDelayMs = 0): Promise<void> {
    this.manualClose = true
    if (this.ws) {
      const socket = this.ws
      if (gracefulDelayMs > 0) {
        try {
          await new Promise((resolve) => setTimeout(resolve, gracefulDelayMs))
        } catch (error) {
          console.error("[WebSocket] Graceful delay interrupted", error)
        }
      }
      socket.close(1000, "Client disconnect")
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getWebSocket(): WebSocket | null {
    return this.ws
  }
}
