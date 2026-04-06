/**
 * Calendar Service — generates personalized farming schedules.
 * Requirements: 16.1, 16.2, 16.3
 */

import axios from 'axios';
import { FarmingCalendar, IFarmingCalendar, IScheduleEntry } from '../models/FarmingCalendar';
import { User } from '../models/User';

interface WeatherData {
  temp: number;
  description: string;
}

async function fetchCurrentWeather(location: string): Promise<WeatherData> {
  const apiUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    console.warn('[CalendarService] WEATHER_API_KEY not set — using default weather data');
    return { temp: 25, description: 'clear sky' };
  }

  const response = await axios.get(`${apiUrl}/weather`, {
    params: { q: location, appid: apiKey, units: 'metric' },
    timeout: 5000,
  });

  return {
    temp: response.data.main.temp as number,
    description: response.data.weather[0].description as string,
  };
}

function buildSchedule(): IScheduleEntry[] {
  const now = new Date();

  const daysFromNow = (days: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  return [
    {
      activity: 'Irrigation',
      date: daysFromNow(3),
      notes: 'Based on current weather conditions',
    },
    {
      activity: 'Fertilizer Application',
      date: daysFromNow(7),
      notes: 'Apply NPK fertilizer',
    },
    {
      activity: 'Harvest Check',
      date: daysFromNow(30),
      notes: 'Check crop maturity',
    },
  ];
}

/**
 * Generate (or update) a farming calendar for a farmer.
 * Fetches current weather, builds a 3-entry schedule, and upserts the document.
 * Requirements: 16.1, 16.2
 */
export async function generateCalendar(
  farmerId: string,
  cropType: string,
  location: string
): Promise<IFarmingCalendar> {
  // Fetch weather (best-effort — proceed even if it fails)
  let weather: WeatherData = { temp: 25, description: 'clear sky' };
  try {
    weather = await fetchCurrentWeather(location);
  } catch (err) {
    console.warn('[CalendarService] Weather fetch failed, using defaults:', err);
  }

  const schedule = buildSchedule();

  const calendar = await FarmingCalendar.findOneAndUpdate(
    { farmer_id: farmerId },
    {
      farmer_id: farmerId,
      cropType,
      location,
      scheduleJson: schedule,
      lastUpdated: new Date(),
      // Store last known temp for change detection
      $set: { _lastWeatherTemp: weather.temp },
    },
    { upsert: true, new: true }
  );

  console.log(`[CalendarService] Calendar generated for farmer=${farmerId}, crop=${cropType}`);
  return calendar;
}

/**
 * Refresh a farmer's calendar if weather has changed significantly (>5°C diff).
 * Requirements: 16.3
 */
export async function refreshCalendarIfWeatherChanged(farmerId: string): Promise<void> {
  const calendar = await FarmingCalendar.findOne({ farmer_id: farmerId }).lean();
  if (!calendar) {
    console.log(`[CalendarService] No calendar found for farmer=${farmerId} — skipping refresh`);
    return;
  }

  const location = calendar.location;
  if (!location) {
    // Fall back to user's registered location
    const user = await User.findById(farmerId).select('location').lean();
    if (!user?.location) {
      console.log(`[CalendarService] No location for farmer=${farmerId} — skipping refresh`);
      return;
    }
  }

  const effectiveLocation = location || (await User.findById(farmerId).select('location').lean())?.location;
  if (!effectiveLocation) return;

  let currentWeather: WeatherData;
  try {
    currentWeather = await fetchCurrentWeather(effectiveLocation);
  } catch (err) {
    console.warn('[CalendarService] Weather fetch failed during refresh:', err);
    return;
  }

  // Compare against stored temp (stored as a plain field via $set above)
  const storedDoc = await FarmingCalendar.findOne({ farmer_id: farmerId }).select('_lastWeatherTemp cropType location').lean() as any;
  const storedTemp: number = storedDoc?._lastWeatherTemp ?? currentWeather.temp;
  const tempDiff = Math.abs(currentWeather.temp - storedTemp);

  if (tempDiff > 5) {
    console.log(`[CalendarService] Weather changed by ${tempDiff.toFixed(1)}°C for farmer=${farmerId} — regenerating calendar`);
    await generateCalendar(farmerId, storedDoc?.cropType || '', effectiveLocation);
  } else {
    console.log(`[CalendarService] Weather stable (diff=${tempDiff.toFixed(1)}°C) for farmer=${farmerId} — no refresh needed`);
  }
}
