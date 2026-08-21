import 'server-only'

export function backendBase(): string {
  return process.env.BE_API_BASE_URL || 'http://localhost:3001/api'
}

export function backendHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.BE_API_KEY ?? '',
  }
}
