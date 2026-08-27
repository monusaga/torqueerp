import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-1234567890',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Google OAuth 2.0 Web Client ID (Google Identity Services "Sign in with Google")
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Firebase project ID (Firebase Authentication with the Google provider)
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'INR',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
};
