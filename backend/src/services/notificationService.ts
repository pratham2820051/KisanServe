/**
 * Notification Service — Firebase Admin SDK
 * Sends push notifications via FCM. FCM handles offline queuing natively (Req 6.4).
 * Requirements: 6.1, 6.2, 6.4, 6.5, 8.5, 3.2, 3.5
 */

import admin from 'firebase-admin';
import { User } from '../models/User';

let initialized = false;

function getFirebaseApp(): admin.app.App {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      // Fallback: use application default credentials (e.g., in CI / emulator)
      admin.initializeApp();
    }
    initialized = true;
  }
  return admin.app();
}

/**
 * Send a push notification to a single user by userId.
 * Looks up the user's FCM token from the User model.
 * If no token is registered, logs and skips silently.
 * FCM queues the message for offline devices and delivers on reconnect (Req 6.4).
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user?.fcmToken) {
      console.log(`[NotificationService] No FCM token for userId=${userId} — skipping`);
      return;
    }

    const app = getFirebaseApp();
    await app.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
    });

    console.log(`[NotificationService] Push sent → userId=${userId} | title="${title}"`);
  } catch (err) {
    console.error(`[NotificationService] Failed to send push to userId=${userId}:`, err);
  }
}

/**
 * Send a push notification to multiple users (batch).
 * Skips users without an FCM token.
 */
export async function sendMulticastNotification(
  userIds: string[],
  title: string,
  body: string
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id fcmToken')
      .lean();

    const tokens = users
      .filter((u) => u.fcmToken)
      .map((u) => u.fcmToken as string);

    if (tokens.length === 0) {
      console.log(`[NotificationService] No FCM tokens found for ${userIds.length} users — skipping multicast`);
      return;
    }

    const app = getFirebaseApp();
    const response = await app.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
    });

    console.log(
      `[NotificationService] Multicast sent: ${response.successCount} success, ${response.failureCount} failed`
    );
  } catch (err) {
    console.error('[NotificationService] Multicast send failed:', err);
  }
}
