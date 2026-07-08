import { createPackApiClient } from './packapiClient'
import { getAiWritingConfig } from './config'
import {
  buildMomentsCopyMessages,
  buildPolishLogMessages,
} from './prompts'
import type {
  AiWritingResult,
  MomentsCopyRequest,
  PackApiChatResult,
  PackApiClientConfig,
  PolishLogRequest,
} from './types'

type WritingPayload = {
  main?: unknown
  alternatives?: unknown
  hashtags?: unknown
  tips?: unknown
}

function ensureText(value: string | undefined, field: string, maxLength: number) {
  const text = value?.trim()

  if (!text) {
    throw new Error(`${field} is required.`)
  }

  if (text.length > maxLength) {
    throw new Error(`${field} is too long. Max ${maxLength} characters.`)
  }

  return text
}

function optionalText(value: string | undefined, maxLength: number) {
  const text = value?.trim()

  if (!text) {
    return undefined
  }

  return text.slice(0, maxLength)
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function stripJsonFence(text: string) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (match?.[1] ?? text).trim()
}

function extractFirstJsonObject(text: string) {
  const source = stripJsonFence(text)
  const start = source.indexOf('{')

  if (start < 0) {
    return source
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === '{') {
      depth += 1
    }

    if (char === '}') {
      depth -= 1
    }

    if (depth === 0) {
      return source.slice(start, index + 1)
    }
  }

  return source
}

function parseWritingPayload(text: string): WritingPayload | undefined {
  try {
    const parsed = JSON.parse(extractFirstJsonObject(text)) as unknown
    return parsed && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

function normalizeWritingResult(result: PackApiChatResult): AiWritingResult {
  const payload = parseWritingPayload(result.text)
  const main = typeof payload?.main === 'string' ? payload.main.trim() : ''

  return {
    text: main || result.text.trim(),
    alternatives: toStringArray(payload?.alternatives),
    hashtags: toStringArray(payload?.hashtags),
    tips: toStringArray(payload?.tips),
    model: result.model,
    usage: result.usage,
    rawText: result.text,
  }
}

function normalizePolishRequest(request: PolishLogRequest): PolishLogRequest {
  return {
    ...request,
    originalText: ensureText(request.originalText, 'originalText', 4_000),
    location: optionalText(request.location, 80),
    dateText: optionalText(request.dateText, 40),
    mood: optionalText(request.mood, 80),
  }
}

function normalizeMomentsRequest(request: MomentsCopyRequest): MomentsCopyRequest {
  const hasAnySeed = [
    request.topic,
    request.location,
    request.photoDescription,
    request.mood,
  ].some((value) => Boolean(value?.trim()))

  if (!hasAnySeed) {
    throw new Error('At least one of topic, location, photoDescription, or mood is required.')
  }

  return {
    ...request,
    topic: optionalText(request.topic, 80),
    location: optionalText(request.location, 80),
    photoDescription: optionalText(request.photoDescription, 1_000),
    mood: optionalText(request.mood, 80),
    audience: optionalText(request.audience, 80),
  }
}

export function createAiWritingService(config: PackApiClientConfig) {
  const client = createPackApiClient(config)

  return {
    async polishLog(request: PolishLogRequest): Promise<AiWritingResult> {
      const result = await client.createChatCompletion({
        messages: buildPolishLogMessages(normalizePolishRequest(request)),
        temperature: 0.68,
        maxTokens: 1_200,
      })

      return normalizeWritingResult(result)
    },

    async generateMomentsCopy(
      request: MomentsCopyRequest,
    ): Promise<AiWritingResult> {
      const result = await client.createChatCompletion({
        messages: buildMomentsCopyMessages(normalizeMomentsRequest(request)),
        temperature: 0.82,
        maxTokens: 1_000,
      })

      return normalizeWritingResult(result)
    },
  }
}

export function createDefaultAiWritingService() {
  return createAiWritingService(getAiWritingConfig())
}
