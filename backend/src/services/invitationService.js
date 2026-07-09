import crypto from 'crypto';
import { env } from '../config/env.js';

export function createSecureToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashToken(token)
  };
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hoursFromNow(hours) {
  return new Date(Date.now() + Number(hours) * 60 * 60 * 1000);
}

export function buildActivationUrl(token) {
  return `${env.frontendOrigin}/vendor/activate?token=${encodeURIComponent(token)}`;
}

export function buildResetUrl(token) {
  return `${env.frontendOrigin}/vendor/reset-password?token=${encodeURIComponent(token)}`;
}

export function logInvitation(email, url) {
  console.log(`Vendor invitation for ${email}: ${url}`);
}
