export type OnlineListener = (online: boolean) => void

export class OnlineDetector {
  private listeners = new Set<OnlineListener>()
  private handler = (): void => this.emit()
  private started = false

  start(): void {
    if (this.started) return
    window.addEventListener('online', this.handler)
    window.addEventListener('offline', this.handler)
    this.started = true
  }

  stop(): void {
    window.removeEventListener('online', this.handler)
    window.removeEventListener('offline', this.handler)
    this.started = false
  }

  get isOnline(): boolean {
    return navigator.onLine
  }

  subscribe(listener: OnlineListener): () => void {
    this.listeners.add(listener)
    listener(this.isOnline)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    const online = this.isOnline
    this.listeners.forEach((l) => l(online))
  }
}
