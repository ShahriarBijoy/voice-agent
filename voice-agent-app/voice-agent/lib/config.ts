const DEFAULT_API_URL = "http://localhost:8000"

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "")

export const API_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL,
)

const derivedWsUrl = API_URL.replace(/^https:\/\//, "wss://").replace(
  /^http:\/\//,
  "ws://",
)

export const WS_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_WS_URL ?? derivedWsUrl,
)

export const WS_ENDPOINT = `${WS_URL}/ws`
