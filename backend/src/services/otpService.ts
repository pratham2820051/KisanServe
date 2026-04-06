import bcrypt from 'bcryptjs';
import twilio from 'twilio';
import { HydratedDocument } from 'mongoose';
import { IUser } from '../models/User';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_SALT_ROUNDS = 10;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a 6-digit OTP, hashes it, stores it on the user document,
 * and sends it via Twilio SMS.
 *
 * Requirements: 1.2
 */
export async function generateAndSendOtp(user: HydratedDocument<IUser>): Promise<string | null> {
  const otp = generateOtp();
  const hash = await bcrypt.hash(otp, OTP_SALT_ROUNDS);

  user.otpHash = hash;
  user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;

  await user.save();

  const isDev = await sendSms(user.phone, `Your AgriConnect OTP is: ${otp}. Valid for 5 minutes.`);
  return isDev ? otp : null;
}

/**
 * Verifies a submitted OTP against the stored hash, enforcing TTL and lockout.
 *
 * Requirements: 1.3, 1.4, 1.5, 18.3
 */
export async function verifyOtp(user: HydratedDocument<IUser>, submittedOtp: string): Promise<true> {
  const now = new Date();

  // Req 1.5 / 18.3: check account lockout
  if (user.otpLockedUntil && user.otpLockedUntil > now) {
    const secondsRemaining = Math.ceil((user.otpLockedUntil.getTime() - now.getTime()) / 1000);
    const minutesRemaining = Math.ceil(secondsRemaining / 60);
    throw new Error(
      `Account is temporarily locked due to too many failed attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
    );
  }

  // Req 1.3 / 1.4: check OTP exists and has not expired
  if (!user.otpHash || !user.otpExpiry) {
    throw new Error('No OTP has been requested for this account. Please request a new OTP.');
  }

  if (user.otpExpiry < now) {
    throw new Error('The OTP has expired. Please request a new one.');
  }

  // Compare submitted OTP against stored hash
  const isMatch = await bcrypt.compare(submittedOtp, user.otpHash);

  if (!isMatch) {
    // Req 1.5: increment failure counter; lock if threshold reached
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;

    if (user.otpAttempts >= 3) {
      user.otpLockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
      await user.save();
      throw new Error(
        'Too many incorrect OTP attempts. Your account has been locked for 15 minutes.'
      );
    }

    const attemptsLeft = 3 - user.otpAttempts;
    await user.save();
    throw new Error(
      `Incorrect OTP. You have ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before your account is locked.`
    );
  }

  // Success: clear OTP fields
  user.otpHash = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save();

  return true;
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log(`\n========================================`);
    console.log(`[OTP DEV MODE] Phone: ${to}`);
    console.log(`[OTP DEV MODE] ${body}`);
    console.log(`========================================\n`);
    return true; // isDev
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({ to, from, body });
  return false;
}
