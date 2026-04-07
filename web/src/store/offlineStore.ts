/**
 * Offline Store — KisanServe Web
 *
 * Caches services, bookings, and alerts in localStorage.
 * Queues booking requests made offline and syncs when connectivity is restored.
 * Uses browser online/offline events for detection.
 */

const KEYS = {
  SERVICES: 'agri_offline_services',
  BOOKINGS: 'agri_offline_bookings',
  ALERTS: 'agri_offline_alerts',
  QUEUE: 'agri_offline_queue',
  LAST_SYNC: 'agri_last_sync',
};

export interface QueuedBooking {
  id: string; // local temp ID
  service_id: string;
  date: string;
  timeSlot: string;
  queuedAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

// ── Cache helpers ────────────────────────────────────────────────────────────

export function cacheServices(services: any[]): void {
  localStorage.setItem(KEYS.SERVICES, JSON.stringify({ data: services, cachedAt: Date.now() }));
}

export function getCachedServices(): any[] {
  try {
    const raw = localStorage.getItem(KEYS.SERVICES);
    if (!raw) return [];
    return JSON.parse(raw).data ?? [];
  } catch { return []; }
}

export function cacheBookings(bookings: any[]): void {
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify({ data: bookings, cachedAt: Date.now() }));
}

export function getCachedBookings(): any[] {
  try {
    const raw = localStorage.getItem(KEYS.BOOKINGS);
    if (!raw) return [];
    return JSON.parse(raw).data ?? [];
  } catch { return []; }
}

export function cacheAlerts(alerts: any[]): void {
  localStorage.setItem(KEYS.ALERTS, JSON.stringify({ data: alerts, cachedAt: Date.now() }));
}

export function getCachedAlerts(): any[] {
  try {
    const raw = localStorage.getItem(KEYS.ALERTS);
    if (!raw) return [];
    return JSON.parse(raw).data ?? [];
  } catch { return []; }
}

export function getLastSync(): number | null {
  const v = localStorage.getItem(KEYS.LAST_SYNC);
  return v ? Number(v) : null;
}

export function setLastSync(): void {
  localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
}

// ── Offline booking queue ────────────────────────────────────────────────────

export function getQueue(): QueuedBooking[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.QUEUE) || '[]');
  } catch { return []; }
}

function saveQueue(queue: QueuedBooking[]): void {
  localStorage.setItem(KEYS.QUEUE, JSON.stringify(queue));
}

export function enqueueBooking(booking: Omit<QueuedBooking, 'id' | 'queuedAt' | 'status'>): QueuedBooking {
  const queue = getQueue();
  const item: QueuedBooking = {
    ...booking,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
    status: 'pending',
  };
  queue.push(item);
  saveQueue(queue);
  return item;
}

export function updateQueueItem(id: string, updates: Partial<QueuedBooking>): void {
  const queue = getQueue().map(item => item.id === id ? { ...item, ...updates } : item);
  saveQueue(queue);
}

export function removeFromQueue(id: string): void {
  saveQueue(getQueue().filter(item => item.id !== id));
}

export function clearSyncedItems(): void {
  saveQueue(getQueue().filter(item => item.status !== 'synced'));
}

// ── Sync engine ──────────────────────────────────────────────────────────────

export async function syncQueue(token: string): Promise<{ synced: number; failed: number }> {
  const queue = getQueue().filter(item => item.status === 'pending' || item.status === 'failed');
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    updateQueueItem(item.id, { status: 'syncing' });
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service_id: item.service_id, date: item.date, timeSlot: item.timeSlot }),
      });
      if (res.ok) {
        updateQueueItem(item.id, { status: 'synced' });
        synced++;
      } else {
        const err = await res.json().catch(() => ({}));
        updateQueueItem(item.id, { status: 'failed', error: err.error || `HTTP ${res.status}` });
        failed++;
      }
    } catch (e: any) {
      updateQueueItem(item.id, { status: 'failed', error: e.message || 'Network error' });
      failed++;
    }
  }

  if (synced > 0) setLastSync();
  return { synced, failed };
}

// ── Online/offline detection ─────────────────────────────────────────────────

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
