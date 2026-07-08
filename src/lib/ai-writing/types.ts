export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type PackApiUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export type PackApiClientConfig = {
  apiKey: string
  baseUrl?: string
  model?: string
  timeoutMs?: number
  defaultTemperature?: number
}

export type PackApiChatInput = {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  topP?: number
  maxTokens?: number
  signal?: AbortSignal
  timeoutMs?: number
}

export type PackApiChatResult = {
  text: string
  model?: string
  usage?: PackApiUsage
  raw: unknown
}

export type WritingTone =
  | 'natural'
  | 'warm'
  | 'literary'
  | 'humorous'
  | 'concise'

export type WritingLength = 'short' | 'medium' | 'long'

export type PolishLogRequest = {
  originalText: string
  tone?: WritingTone
  length?: WritingLength
  location?: string
  dateText?: string
  mood?: string
  keepFacts?: boolean
}

export type MomentsCopyRequest = {
  topic?: string
  location?: string
  photoDescription?: string
  mood?: string
  audience?: string
  tone?: WritingTone
  length?: WritingLength
  includeHashtags?: boolean
}

export type AiWritingResult = {
  text: string
  alternatives: string[]
  hashtags: string[]
  tips: string[]
  model?: string
  usage?: PackApiUsage
  rawText: string
}
