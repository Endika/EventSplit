export interface ErrorDetails {
  name: string
  message: string
}

export const errorDetails = (err: unknown): ErrorDetails => ({
  name: err instanceof Error ? err.constructor.name : 'Unknown',
  message: err instanceof Error ? err.message : String(err),
})
