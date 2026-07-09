import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);

  return {
    id: Number(payload.sub),
    email: payload.email,
    role: payload.role
  };
}
