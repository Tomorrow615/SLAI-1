import type { PackApiClientConfig } from './types'

export const DEFAULT_PACKAPI_BASE_URL = 'https://www.packyapi.com/v1'
export const DEFAULT_PACKAPI_MODEL = 'gemini-3-pro-preview'
export const DEFAULT_PACKAPI_TIMEOUT_MS = 45_000
export const DEFAULT_PACKAPI_TEMPERATURE = 0.72

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getAiWritingConfig(): PackApiClientConfig {
  const apiKey = import.meta.env.VITE_PACKAPI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('AI 写作功能未配置，请在 .env.local 中设置 VITE_PACKAPI_API_KEY')
  }

  return {
    apiKey,
    baseUrl: import.meta.env.VITE_PACKAPI_BASE_URL?.trim() || DEFAULT_PACKAPI_BASE_URL,
    model: import.meta.env.VITE_PACKAPI_MODEL?.trim() || DEFAULT_PACKAPI_MODEL,
    timeoutMs: readPositiveInteger(
      import.meta.env.VITE_PACKAPI_TIMEOUT_MS,
      DEFAULT_PACKAPI_TIMEOUT_MS,
    ),
    defaultTemperature: DEFAULT_PACKAPI_TEMPERATURE,
  }
}
