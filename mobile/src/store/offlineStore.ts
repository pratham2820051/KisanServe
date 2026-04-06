import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  services: 'cache:services',
  bookings: 'cache:bookings',
  chat: (query: string) => `cache:chat:${query.slice(0, 20)}`,
};

export async function cacheServices(services: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.services, JSON.stringify(services));
  } catch {
    // silently fail
  }
}

export async function getCachedServices(): Promise<unknown[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.services);
    return raw ? (JSON.parse(raw) as unknown[]) : null;
  } catch {
    return null;
  }
}

export async function cacheBookings(bookings: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.bookings, JSON.stringify(bookings));
  } catch {
    // silently fail
  }
}

export async function getCachedBookings(): Promise<unknown[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.bookings);
    return raw ? (JSON.parse(raw) as unknown[]) : null;
  } catch {
    return null;
  }
}

export async function cacheChatResponse(query: string, response: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.chat(query), response);
  } catch {
    // silently fail
  }
}

export async function getCachedChatResponse(query: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.chat(query));
  } catch {
    return null;
  }
}
