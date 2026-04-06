/**
 * Alert Service — ingests alert events, filters farmers by location,
 * localizes messages, and dispatches FCM push notifications.
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import { Alert, AlertType } from '../models/Alert';
import { User } from '../models/User';
import { translateText } from './translationService';
import { sendPushNotification } from './notificationService';

interface AlertData {
  type: AlertType;
  message: string;
  targetLocation: string;
  expiresAt?: Date;
}

/**
 * Dispatch an alert:
 * 1. Persist the Alert record.
 * 2. Find all active Farmers whose location matches targetLocation.
 * 3. Filter out farmers who have opted out of this alert type (Req 6.3).
 * 4. Translate the message to each farmer's language preference (Req 6.5).
 * 5. Send FCM push notification per farmer (FCM handles offline queuing — Req 6.4).
 */
export async function dispatchAlert(alertData: AlertData): Promise<void> {
  // 1. Persist alert
  const alert = await Alert.create({
    type: alertData.type,
    message: alertData.message,
    targetLocation: alertData.targetLocation,
    isActive: true,
    expiresAt: alertData.expiresAt,
  });

  // 2. Find active Farmers in the target location
  const farmers = await User.find({
    role: 'Farmer',
    isActive: true,
    location: alertData.targetLocation,
  }).select('_id languagePreference alertPreferences').lean();

  // 3. Filter out farmers who opted out of this alert type
  const eligibleFarmers = farmers.filter(
    (f) => !f.alertPreferences.includes(alertData.type)
  );

  if (eligibleFarmers.length === 0) {
    console.log(
      `[AlertService] No eligible farmers for alert type="${alertData.type}" location="${alertData.targetLocation}"`
    );
    return;
  }

  // 4 & 5. Translate and send per farmer
  let dispatched = 0;
  for (const farmer of eligibleFarmers) {
    const lang = farmer.languagePreference ?? 'en';
    const { translated } = await translateText(alertData.message, lang);

    await sendPushNotification(
      String(farmer._id),
      alertData.type.charAt(0).toUpperCase() + alertData.type.slice(1),
      translated
    );
    dispatched++;
  }

  console.log(
    `[AlertService] Dispatched alert id=${alert._id} type="${alertData.type}" to ${dispatched}/${farmers.length} farmers`
  );
}
