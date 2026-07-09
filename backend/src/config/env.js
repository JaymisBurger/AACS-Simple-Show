import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    socketPath: process.env.DB_SOCKET_PATH || undefined
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  uploadDir: path.resolve(backendRoot, process.env.UPLOAD_DIR || 'uploads'),
  maxUploadSizeBytes: Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024,
  vendorLogoMaxSizeBytes: Number(process.env.VENDOR_LOGO_MAX_SIZE_MB || process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024,
  invitationTokenExpiresHours: Number(process.env.INVITATION_TOKEN_EXPIRES_HOURS || 72),
  passwordResetTokenExpiresHours: Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_HOURS || 24),
  publicTokenExpiresDays: Number(process.env.PUBLIC_TOKEN_EXPIRES_DAYS || 90),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL,
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD
};
