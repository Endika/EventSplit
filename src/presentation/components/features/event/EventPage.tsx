export function EventPage({ eventId }: { eventId: string }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Event {eventId}</h1>
      <p>Coming next.</p>
    </main>
  )
}
