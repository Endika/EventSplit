export interface ErrorDetails {
  name: string
  message: string
}

export const errorDetails = (err: unknown): ErrorDetails => ({
  name: err instanceof Error ? err.constructor.name : 'Unknown',
  message: err instanceof Error ? err.message : String(err),
})

export const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback

export const errorReportLine = (e: { context: string; name: string; message: string }): string =>
  `[${e.context}] ${e.name}: ${e.message}`
