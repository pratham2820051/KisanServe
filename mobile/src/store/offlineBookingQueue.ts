import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline:booking_queue';

interface QueuedBooking {
  id: string;
  service_id: string;
  date: string;
  timeSlot: string;
  queuedAt: string;
}

async function readQueue(): Promise<QueuedBooking[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedBooking[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedBooking[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function queueBooking(booking: {
  service_id: string;
  date: string;
  timeSlot: string;
}): Promise<void> {
  const queue = await readQueue();
  const entry: QueuedBooking = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...booking,
    queuedAt: new Date().toISOString(),
  };
  queue.push(entry);
  await writeQueue(queue);
}

export async function getQueuedBookings(): Promise<QueuedBooking[]> {
  return readQueue();
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((b) => b.id !== id));
}

export async function syncQueuedBookings(
  apiBaseUrl: string,
  authToken: string,
): Promise<{ synced: number; conflicts: Array<{ booking: unknown; error: string }> }> {
  const queue = await readQueue();
  let synced = 0;
  const conflicts: Array<{ booking: unknown; error: string }> = [];

  for (const booking of queue) {
    try {
      const response = await fetch(`${apiBaseUrl}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          service_id: booking.service_id,
          date: booking.date,
          timeSlot: booking.timeSlot,
        }),
      });

      if (response.status === 201) {
        await removeFromQueue(booking.id);
        synced++;
      } else if (response.status === 409) {
        conflicts.push({ booking, error: 'Time slot is no longer available' });
      }
      // other errors: leave in queue for retry
    } catch {
      // network error: leave in queue for retry
    }
  }

  return { synced, conflicts };
}
