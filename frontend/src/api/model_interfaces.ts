// Model Interfaces

interface BaseRow {
  id: number
}

export interface Channel extends BaseRow {
  name: string
  name_lower: string
}

export interface Emote extends BaseRow {
  name: string
  emote_id: string
}

export interface EmoteSet extends BaseRow {
  name: string
  set_id: string
  channels: Channel[]
  emotes: Emote[]
}

export interface ChatFile extends BaseRow {
  file: File
  filename: string
  channel: Channel
  is_preprocessed: boolean
  uploaded_at: string
  metadata: JSON
}

export interface Message extends BaseRow {
  parent_log: ChatFile
  timestamp: Date
  username: string
  message: string
  emotes: Emote[]
  sentiment_score?: number
}

export interface Task extends BaseRow {
  ticket: string
  status: string
  result: string
}
