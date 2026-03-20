export function getForwardedAuthHeaders(requestHeaders: Headers): HeadersInit | undefined {
  const cookie = requestHeaders.get("cookie")

  if (!cookie) {
    return undefined
  }

  return {
    cookie,
  }
}
