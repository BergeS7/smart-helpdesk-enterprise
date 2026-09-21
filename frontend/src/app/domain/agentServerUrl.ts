export function agentServerUrl(apiUrl: string, origin: string): URL {
  return new URL(`${apiUrl.replace(/\/$/, "")}/assets`, origin);
}
