/** Thrown by a geo lookup helper on an HTTP failure or a network failure. */
export class GeoLookupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeoLookupError'
  }
}
