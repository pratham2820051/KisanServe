/**
 * Alerts routes
 * POST   /alerts                      — Admin: create & dispatch an alert
 * GET    /alerts                      — Farmer: get recent active alerts for their location
 * PATCH  /users/:id/alert-preferences — Authenticated user: update disabled alert types
 * PATCH  /users/:id/fcm-token         — Authenticated user: register/update FCM token
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly, farmerOnly } from '../middleware/rbac';
import { dispatchAlert } from '../services/alertService';
import { Alert } from '../models/Alert';
import { User } from '../models/User';

const router = Router();

/**
 * POST /alerts
 * Admin only — create and dispatch an alert to all matching farmers.
 */
router.post('/', authenticate, adminOnly, async (req: Request, res: Response): Promise<void> => {
  const { type, message, targetLocation, expiresAt } = req.body;

  if (!type || !message || !targetLocation) {
    res.status(400).json({ error: 'type, message, and targetLocation are required' });
    return;
  }

  const validTypes = ['weather', 'marketPrice', 'governmentScheme', 'emergency'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    await dispatchAlert({ type, message, targetLocation, expiresAt });
    res.status(201).json({ message: 'Alert dispatched successfully' });
  } catch (err) {
    console.error('[AlertsRoute] POST /alerts error:', err);
    res.status(500).json({ error: 'Failed to dispatch alert' });
  }
});

/**
 * GET /alerts
 * Authenticated Farmer — returns recent active alerts for their registered location.
 */
router.get('/', authenticate, farmerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('location').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const alerts = await Alert.find({
      isActive: true,
      targetLocation: user.location,
      $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ alerts });
  } catch (err) {
    console.error('[AlertsRoute] GET /alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * PATCH /users/:id/alert-preferences
 * Authenticated user — update the list of disabled alert types (opt-out).
 * Body: { disabledAlertTypes: string[] }
 */
router.patch('/users/:id/alert-preferences', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Users can only update their own preferences (Admins can update any)
  if (req.user!.userId !== id && req.user!.role !== 'Admin') {
    res.status(403).json({ error: 'You can only update your own alert preferences' });
    return;
  }

  const { disabledAlertTypes } = req.body;
  if (!Array.isArray(disabledAlertTypes)) {
    res.status(400).json({ error: 'disabledAlertTypes must be an array of strings' });
    return;
  }

  const validTypes = ['weather', 'marketPrice', 'governmentScheme', 'emergency'];
  const invalid = disabledAlertTypes.filter((t: string) => !validTypes.includes(t));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Invalid alert types: ${invalid.join(', ')}` });
    return;
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { alertPreferences: disabledAlertTypes },
      { new: true }
    ).select('_id alertPreferences').lean();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ userId: user._id, alertPreferences: user.alertPreferences });
  } catch (err) {
    console.error('[AlertsRoute] PATCH /users/:id/alert-preferences error:', err);
    res.status(500).json({ error: 'Failed to update alert preferences' });
  }
});

/**
 * PATCH /users/:id/fcm-token
 * Authenticated user — register or update their FCM device token.
 * Body: { fcmToken: string }
 */
router.patch('/users/:id/fcm-token', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user!.userId !== id && req.user!.role !== 'Admin') {
    res.status(403).json({ error: 'You can only update your own FCM token' });
    return;
  }

  const { fcmToken } = req.body;
  if (!fcmToken || typeof fcmToken !== 'string') {
    res.status(400).json({ error: 'fcmToken is required and must be a string' });
    return;
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { fcmToken },
      { new: true }
    ).select('_id').lean();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'FCM token updated successfully' });
  } catch (err) {
    console.error('[AlertsRoute] PATCH /users/:id/fcm-token error:', err);
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

export default router;
