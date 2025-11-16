export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  timing?: {
    llm_time: number;
    tts_time: number;
    total_time: number;
  };
}

export interface ReadyMessage {
  type: 'ready'
  message: string
}

export interface TranscriptMessage {
  type: 'transcript'
  text?: string
  is_final?: boolean
}

export interface UserMessage {
  type: 'user_message'
  text: string
}

export interface AssistantChunkMessage {
  type: 'assistant_chunk'
  text: string
}

export interface AssistantMessage {
  type: 'assistant_message'
  text: string
  timing?: {
    llm_time: number
    tts_time: number
    total_time: number
  }
}

export interface TtsCompleteMessage {
  type: 'tts_complete'
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export interface ClearedMessage {
  type: 'cleared'
  message: string
}

export interface ConversationSavedMessage {
  type: 'conversation_saved'
  conversation_id: string
}

export interface CalendarRefreshMessage {
  type: 'calendar_refresh'
}

export interface TimingUpdateMessage {
  type: 'timing_update'
  timing: {
    tts_time: number
    total_time?: number
  }
}

export type WebSocketMessage =
  | ReadyMessage
  | TranscriptMessage
  | UserMessage
  | AssistantChunkMessage
  | AssistantMessage
  | TtsCompleteMessage
  | TimingUpdateMessage
  | ErrorMessage
  | ClearedMessage
  | ConversationSavedMessage
  | CalendarRefreshMessage

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing'
}
