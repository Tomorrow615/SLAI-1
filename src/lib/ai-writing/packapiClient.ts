import {
  DEFAULT_PACKAPI_BASE_URL,
  DEFAULT_PACKAPI_MODEL,
  DEFAULT_PACKAPI_TEMPERATURE,
  DEFAULT_PACKAPI_TIMEOUT_MS,
} from './config'
import type {
  PackApiChatInput,
  PackApiChatResult,
  PackApiClientConfig,
  PackApiUsage,
} from './types'

type OpenAiChatCompletionResponse = {
  model?: string
  choices?: Array<{
    message?: {
      content?: unknown
    }
    text?: string
  }>
  error?: {
    message?: string
    type?: string
    code?: string
  }
  usage?: PackApiUsage
}

export class PackApiError extends Error {
  status?: number
  payload?: unknown

  constructor(message: string, options?: { status?: number; payload?: unknown }) {
    super(message)
    this.name = 'PackApiError'
    this.status = options?.status
    this.payload = options?.payload
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function compactBody<T extends Record<string, unknown>>(body: T) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  )
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text
        }

        return ''
      })
      .join('')
      .trim()
  }

  return ''
}

async function parseJsonSafely(response: Response) {
  const text = await response.text()

  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function createAbortController(inputSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const abortFromInput = () => controller.abort(inputSignal?.reason)

  if (inputSignal?.aborted) {
    abortFromInput()
  } else {
    inputSignal?.addEventListener('abort', abortFromInput, { once: true })
  }

  const timeoutId =
    timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined

  return {
    signal: controller.signal,
    cleanup() {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      inputSignal?.removeEventListener('abort', abortFromInput)
    },
  }
}

function extractAssistantText(payload: OpenAiChatCompletionResponse) {
  const firstChoice = payload.choices?.[0]
  const text =
    extractTextFromContent(firstChoice?.message?.content) ||
    extractTextFromContent(firstChoice?.text)

  if (!text) {
    throw new PackApiError('PackAPI returned an empty assistant message.', {
      payload,
    })
  }

  return text
}

function formatApiError(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object' &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message
  }

  if (typeof payload === 'string') {
    return payload.slice(0, 300)
  }

  return 'Unknown PackAPI error'
}

export function createPackApiClient(config: PackApiClientConfig) {
  const baseUrl = trimTrailingSlash(config.baseUrl || DEFAULT_PACKAPI_BASE_URL)
  const model = config.model || DEFAULT_PACKAPI_MODEL

  async function createChatCompletion(
    input: PackApiChatInput,
  ): Promise<PackApiChatResult> {
    if (!input.messages.length) {
      throw new PackApiError('At least one chat message is required.')
    }

    const timeoutMs = input.timeoutMs ?? config.timeoutMs ?? DEFAULT_PACKAPI_TIMEOUT_MS
    const abort = createAbortController(input.signal, timeoutMs)

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          compactBody({
            model: input.model || model,
            messages: input.messages,
            temperature:
              input.temperature ??
              config.defaultTemperature ??
              DEFAULT_PACKAPI_TEMPERATURE,
            top_p: input.topP,
            max_tokens: input.maxTokens,
            stream: false,
          }),
        ),
        signal: abort.signal,
      })

      const payload = (await parseJsonSafely(response)) as OpenAiChatCompletionResponse

      if (!response.ok) {
        throw new PackApiError(
          `PackAPI request failed (${response.status}): ${formatApiError(payload)}`,
          { status: response.status, payload },
        )
      }

      if (payload.error?.message) {
        throw new PackApiError(`PackAPI returned error: ${payload.error.message}`, {
          payload,
        })
      }

      return {
        text: extractAssistantText(payload),
        model: payload.model,
        usage: payload.usage,
        raw: payload,
      }
    } catch (error) {
      if (error instanceof PackApiError) {
        throw error
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new PackApiError(`PackAPI request timed out after ${timeoutMs}ms.`)
      }

      throw new PackApiError(
        error instanceof Error ? error.message : 'PackAPI request failed.',
      )
    } finally {
      abort.cleanup()
    }
  }

  return {
    createChatCompletion,
  }
}
