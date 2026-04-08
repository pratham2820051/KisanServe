import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { generateToken, generateRefreshToken, JwtPayload } from '../middleware/auth';

const VALID_ROLES = ['Farmer', 'Service_Provider', 'Admin'];
const VALID_LANGUAGES = ['en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml'];

/**
 * POST /auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { name, phone, password, role, location, languagePreference } = req.body;

  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  if (!phone?.trim()) { res.status(400).json({ error: 'Phone is required' }); return; }
  if (!password || password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
  if (!role || !VALID_ROLES.includes(role)) { res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }); return; }

  // Normalize phone — add +91 if no country code
  const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;

  const { data: existing } = await supabase.from('users').select('id').eq('phone', normalizedPhone).single();
  if (existing) { res.status(409).json({ error: 'An account with this phone already exists' }); return; }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase.from('users').insert({
    name: name.trim(),
    phone: normalizedPhone,
    password_hash,
    role,
    location: location?.trim() ?? '',
    language_preference: languagePreference ?? 'en',
  }).select().single();

  if (error || !user) { res.status(500).json({ error: 'Failed to create account' }); return; }

  const payload: JwtPayload = { userId: user.id, role: user.role, phone: user.phone };
  res.status(201).json({
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, languagePreference: user.language_preference },
  });
}

/**
 * POST /auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { phone, password, role } = req.body;

  if (!phone?.trim()) { res.status(400).json({ error: 'Phone is required' }); return; }
  if (!password) { res.status(400).json({ error: 'Password is required' }); return; }
  if (!role || !VALID_ROLES.includes(role)) { res.status(400).json({ error: 'Please select a role' }); return; }

  // Normalize phone — add +91 if no country code
  const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;

  const { data: user } = await supabase.from('users').select('*').eq('phone', normalizedPhone).single();
  if (!user) { res.status(401).json({ error: 'No account found with this phone number' }); return; }
  if (!user.is_active) { res.status(403).json({ error: 'Account is deactivated. Please contact support.' }); return; }

  // Role must match
  if (user.role !== role) {
    res.status(403).json({ error: `This account is registered as ${user.role}, not ${role}. Please select the correct role.` });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) { res.status(401).json({ error: 'Invalid phone or password' }); return; }

  const payload: JwtPayload = { userId: user.id, role: user.role, phone: user.phone };
  res.status(200).json({
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, languagePreference: user.language_preference },
  });
}
