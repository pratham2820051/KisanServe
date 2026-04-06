import apiClient from './apiClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  phone: string;
  role: 'farmer' | 'provider' | 'admin';
  name?: string;
  location?: string;
  languagePreference?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Service {
  id: string;
  providerId: string;
  category: string;
  price: number;
  availability: boolean;
  rating: number;
  trustScore?: number;
  [key: string]: unknown;
}

export interface Booking {
  id: string;
  serviceId: string;
  farmerId: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  [key: string]: unknown;
}

export interface Feedback {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  answer: string;
  [key: string]: unknown;
}

export interface CropDoctorResult {
  issues: Array<{ name: string; treatment: string; confidence: number }>;
  [key: string]: unknown;
}

export interface Recommendation {
  services: Service[];
  [key: string]: unknown;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface Earnings {
  total: number;
  breakdown: Array<{ bookingId: string; amount: number; date: string }>;
  [key: string]: unknown;
}

export interface FarmingCalendar {
  cropType: string;
  location: string;
  schedule: Array<{ activity: string; date: string; notes?: string }>;
  [key: string]: unknown;
}

export interface ServiceListParams {
  lng?: number;
  lat?: number;
  radius?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'distance';
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Initiate login / registration — triggers OTP send */
export async function login(
  phone: string,
  role: 'farmer' | 'provider' | 'admin',
  name?: string,
  location?: string,
  languagePreference?: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/login', {
    phone,
    role,
    name,
    location,
    languagePreference,
  });
  return data;
}

/** Verify OTP and receive session tokens */
export async function verifyOtp(phone: string, otp: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/verify-otp', { phone, otp });
  return data;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export async function getServices(params: ServiceListParams = {}): Promise<Service[]> {
  const { data } = await apiClient.get<Service[]>('/services', { params });
  return data;
}

export async function createService(
  serviceData: Omit<Service, 'id' | 'providerId' | 'rating'>,
): Promise<Service> {
  const { data } = await apiClient.post<Service>('/services', serviceData);
  return data;
}

export async function updateService(
  id: string,
  serviceData: Partial<Omit<Service, 'id' | 'providerId'>>,
): Promise<Service> {
  const { data } = await apiClient.patch<Service>(`/services/${id}`, serviceData);
  return data;
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(`/services/${id}`);
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function createBooking(bookingData: {
  service_id: string;
  date: string;
  timeSlot: string;
}): Promise<Booking> {
  const { data } = await apiClient.post<Booking>('/bookings', bookingData);
  return data;
}

export async function updateBookingStatus(
  id: string,
  status: Booking['status'],
  cancellationReason?: string,
): Promise<Booking> {
  const { data } = await apiClient.patch<Booking>(`/bookings/${id}`, {
    status,
    ...(cancellationReason ? { cancellationReason } : {}),
  });
  return data;
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(feedbackData: {
  booking_id: string;
  rating: number;
  comment?: string;
}): Promise<Feedback> {
  const { data } = await apiClient.post<Feedback>('/feedback', feedbackData);
  return data;
}

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

export async function queryChat(query: string): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/chatbot/query', { query });
  return data;
}

// ---------------------------------------------------------------------------
// Crop Doctor
// ---------------------------------------------------------------------------

export async function analyzeImage(imageUri: string): Promise<CropDoctorResult> {
  const form = new FormData();
  form.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'crop.jpg',
  } as unknown as Blob);

  const { data } = await apiClient.post<CropDoctorResult>('/crop-doctor/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export async function getRecommendations(): Promise<Recommendation> {
  const { data } = await apiClient.get<Recommendation>('/recommendations');
  return data;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function getAlerts(): Promise<Alert[]> {
  const { data } = await apiClient.get<Alert[]>('/alerts');
  return data;
}

export async function updateAlertPreferences(
  userId: string,
  disabledAlertTypes: string[],
): Promise<void> {
  await apiClient.patch(`/alerts/users/${userId}/alert-preferences`, { disabledAlertTypes });
}

export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
  await apiClient.patch(`/alerts/users/${userId}/fcm-token`, { fcmToken });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export async function getProviderBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>('/provider/bookings');
  return data;
}

export async function getProviderEarnings(): Promise<Earnings> {
  const { data } = await apiClient.get<Earnings>('/provider/earnings');
  return data;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export async function generateCalendar(
  cropType: string,
  location: string,
): Promise<FarmingCalendar> {
  const { data } = await apiClient.post<FarmingCalendar>('/calendar/generate', {
    cropType,
    location,
  });
  return data;
}

export async function getCalendar(): Promise<FarmingCalendar> {
  const { data } = await apiClient.get<FarmingCalendar>('/calendar');
  return data;
}
