/**
 * AudioProcessor - Handles microphone audio capture and conversion to PCM format
 * for streaming to the backend
 */
export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private ws: WebSocket | null = null
  private silentGain: GainNode | null = null

  async initialize(ws: WebSocket, deviceId?: string): Promise<void> {
    this.ws = ws

    try {
      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Create audio context with 16kHz sample rate for Soniox
      this.audioContext = new AudioContext({ sampleRate: 16000 })

      // Create media stream source
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream)

      // Create script processor for audio data
      // Buffer size: 4096 samples
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

      this.processor.onaudioprocess = (event) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          const pcmData = this.floatTo16BitPCM(inputData)
          this.ws.send(pcmData)
        }
      }

      // Connect the nodes without feeding audio back to the speakers
      this.source.connect(this.processor)
      this.silentGain = this.audioContext.createGain()
      this.silentGain.gain.value = 0
      this.processor.connect(this.silentGain)
      this.silentGain.connect(this.audioContext.destination)

      console.log("[AudioProcessor] Initialized successfully")
    } catch (error) {
      console.error("[AudioProcessor] Failed to initialize:", error)
      throw error
    }
  }

  /**
   * Convert Float32Array to 16-bit PCM (Int16Array)
   * This matches the format expected by Soniox (pcm_s16le)
   */
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp values to [-1, 1] and convert to 16-bit integer
      const sample = Math.max(-1, Math.min(1, float32Array[i]))
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(i * 2, int16Sample, true) // true = little-endian
    }

    return buffer
  }

  /**
   * Signal end of audio stream to backend
   */
  finalize(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "finalize" }))
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.processor !== null && this.mediaStream !== null
  }

  /**
   * Stop recording and clean up resources
   */
  stopRecording(): void {
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.silentGain) {
      this.silentGain.disconnect()
      this.silentGain = null
    }

    console.log("[AudioProcessor] Stopped recording")
  }
}

/**
 * AudioPlayer - Handles playback of audio received from the backend
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private readonly pcmSampleRate = 24000
  private nextStartTime = 0
  private activeSources: AudioBufferSourceNode[] = []

  constructor() {
    // Create audio context for playback
    this.audioContext = new AudioContext({ sampleRate: this.pcmSampleRate })
    console.log("[AudioPlayer] AudioPlayer initialized with 24kHz audio context")
  }

  async playAudio(data: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      console.warn("[AudioPlayer] Audio context not initialized")
      return
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === "suspended") {
      console.log("[AudioPlayer] Resuming suspended audio context")
      await this.audioContext.resume()
    }

    console.log(`[AudioPlayer] Received audio data: ${data.byteLength} bytes`)
    console.log(`[AudioPlayer] Audio context state: ${this.audioContext.state}`)

    const header = new Uint8Array(data.slice(0, 4))
    const isWav =
      header.length === 4 &&
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46

    try {
      let audioBuffer: AudioBuffer | null

      if (isWav) {
        audioBuffer = await this.audioContext.decodeAudioData(data.slice(0))
        console.log(
          `[AudioPlayer] Decoded WAV chunk: ${audioBuffer.duration}s @ ` +
            `${audioBuffer.sampleRate}Hz`
        )
      } else {
        audioBuffer = this.decodePcm16(data)
        if (audioBuffer) {
          console.log(
            `[AudioPlayer] Decoded PCM16 chunk: ${audioBuffer.duration}s @ ` +
              `${audioBuffer.sampleRate}Hz`
          )
        }
      }

      if (!audioBuffer) {
        console.warn("[AudioPlayer] Failed to decode audio chunk")
        return
      }

      this.scheduleBuffer(audioBuffer)
    } catch (error) {
      console.error("[AudioPlayer] Failed to decode audio:", error)
      console.error("[AudioPlayer] Audio data length:", data.byteLength)
      console.error(
        "[AudioPlayer] First 16 bytes:",
        new Uint8Array(data.slice(0, 16))
      )
      console.error("[AudioPlayer] Was WAV header detected:", isWav)
    }
  }

  // Manually convert PCM16 payloads into Web Audio buffers for streaming playback
  private decodePcm16(data: ArrayBuffer): AudioBuffer | null {
    if (!this.audioContext) {
      console.warn("[AudioPlayer] Audio context not initialized for PCM chunks")
      return null
    }

    if (data.byteLength % 2 !== 0) {
      console.warn(
        `[AudioPlayer] PCM data has odd length (${data.byteLength} bytes)`
      )
      return null
    }

    const sampleCount = data.byteLength / 2
    const view = new DataView(data)
    const audioBuffer = this.audioContext.createBuffer(
      1,
      sampleCount,
      this.pcmSampleRate
    )
    const channelData = audioBuffer.getChannelData(0)
    const scale = 1 / 0x8000

    for (let i = 0; i < sampleCount; i++) {
      const sample = view.getInt16(i * 2, true)
      channelData[i] = sample * scale
    }

    return audioBuffer
  }

  private scheduleBuffer(buffer: AudioBuffer): void {
    if (!this.audioContext) {
      console.warn("[AudioPlayer] Audio context missing, cannot schedule buffer")
      return
    }

    const context = this.audioContext
    const now = context.currentTime
    if (this.nextStartTime < now) {
      this.nextStartTime = now
    }

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)

    const startTime = this.nextStartTime
    this.nextStartTime += buffer.duration

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source)
    }

    console.log(
      `[AudioPlayer] Scheduling buffer at ${startTime.toFixed(3)}s ` +
        `(+${(startTime - now).toFixed(3)}s delay)`
    )
    source.start(startTime)
    this.activeSources.push(source)
  }

  stop(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop()
      } catch (error) {
        console.warn("[AudioPlayer] Failed to stop source", error)
      }
    })
    this.activeSources = []

    if (this.audioContext) {
      this.nextStartTime = 0
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
