
// // auth-service/src/config/index.js
// const path = require('path');

// const env = process.env.NODE_ENV || 'development';
// // Construct path relative to this config file's directory
// const envPath = path.resolve(__dirname, 'env', `${env}.env`);


// // Ensure dotenv is loaded before this module is fully parsed by other files
// // by any other files that might `require` this config.
// const dotenvResult = require('dotenv').config({ path: envPath });

// if (dotenvResult.error) {
//   console.warn(`[AuthService Config] Error loading .env file from ${envPath}: ${dotenvResult.error.message}. Relying on preset environment variables if available.`);
// }


// const requiredVars = [
//   'JWT_SECRET',
//   'JWT_REFRESH_SECRET',
//   'AUTH_MONGO_URI',
//   'EMAIL_USER',
//   'EMAIL_PASSWORD',
//   'INTERNAL_API_KEY', // Crucial for inter-service communication
//   'AUTH_MONGO_URI',
//   'INITIAL_ADMIN_EMAIL',
//   'INITIAL_ADMIN_PASSWORD',
//   'RAZORPAY_KEY_ID',
//   'RAZORPAY_KEY_SECRET',
//   'SUBSCRIPTION_PRICE',
//   'SUBSCRIPTION_DURATION_DAYS',

// ];

// const missingVars = requiredVars.filter(varName => !process.env[varName]);

// if (missingVars.length > 0) {
//   console.error('[AuthService Config] FATAL: Missing required environment variables:', missingVars.join(', '));
//   if (env === 'production' || process.env.CI) { // Exit in prod or CI if critical vars are missing
//     process.exit(1);
//   } else {
//     console.warn("[AuthService Config] Development mode: Will proceed despite missing vars, but functionality may be impaired.");
//   }
// }

// module.exports = {
//   JWT_SECRET: process.env.JWT_SECRET,
//   JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
//   JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h', // Access token expiry
//   JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Refresh token expiry
//   TOKEN_AUDIENCE: process.env.TOKEN_AUDIENCE || 'Shikshaarthi-users',
//   TOKEN_ISSUER: process.env.TOKEN_ISSUER || 'Shikshaarthi',

//   AUTH_MONGO_URI: process.env.AUTH_MONGO_URI,
//   INTERNAL_API_KEY: process.env.INTERNAL_API_KEY, // For internal service communication

//   EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
//   EMAIL_USER: process.env.EMAIL_USER,
//   EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
//   EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER,
//   INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || 'shivanisrichippa@gmail.com',
//   INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || '123456789',
//   RAZORPAY_KEY_ID:process.env.RAZORPAY_KEY_ID,
//   RAZORPAY_KEY_SECRET:process.env.RAZORPAY_KEY_SECRET,
//   SUBSCRIPTION_PRICE:process.env.SUBSCRIPTION_PRICE,
//   SUBSCRIPTION_DURATION_DAYS:process.env.SUBSCRIPTION_DURATION_DAYS,

//   GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

//   PORT: process.env.PORT || 3001,
//   NODE_ENV: env,
//   SERVICE_NAME: process.env.SERVICE_NAME || 'auth-service',

//   RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || (15 * 60 * 1000),
//   RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

//   FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173', // Default for local dev

//   BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,

//   // Supercoin related (defaults, can be overridden by env)
//   COINS_LOGIN_BONUS: parseInt(process.env.COINS_LOGIN_BONUS, 10) || 50,
//   COINS_RENTAL_ROOM: parseInt(process.env.COINS_RENTAL_ROOM, 10) || 20,
//   COINS_MESS_SERVICE: parseInt(process.env.COINS_MESS_SERVICE, 10) || 15,
//   COINS_HEALTHCARE_SERVICE: parseInt(process.env.COINS_HEALTHCARE_SERVICE, 10) || 10,
//   COINS_HOUSEHOLD_SERVICE: parseInt(process.env.COINS_HOUSEHOLD_SERVICE, 10) || 15,
// };


// auth-service/src/config/index.js - FIXED
const path = require('path');

const env = process.env.NODE_ENV || 'development';
// Construct path relative to this config file's directory
const envPath = path.resolve(__dirname, 'env', `${env}.env`);

// Ensure dotenv is loaded before this module is fully parsed by other files
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.warn(`[AuthService Config] Error loading .env file from ${envPath}: ${dotenvResult.error.message}. Relying on preset environment variables if available.`);
} else {
  console.log(`[AuthService Config] Successfully loaded environment variables from ${envPath}`);
}

const requiredVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'AUTH_MONGO_URI',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'INTERNAL_API_KEY', // Crucial for inter-service communication
  'INITIAL_ADMIN_EMAIL',
  'INITIAL_ADMIN_PASSWORD',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SUBSCRIPTION_PRICE',
  'SUBSCRIPTION_DURATION_DAYS',
  'LOCATIONIQ_API_KEY'
];

// Check for missing variables and log them
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('[AuthService Config] FATAL: Missing required environment variables:', missingVars.join(', '));
  if (env === 'production' || process.env.CI) { // Exit in prod or CI if critical vars are missing
    process.exit(1);
  } else {
    console.warn("[AuthService Config] Development mode: Will proceed despite missing vars, but functionality may be impaired.");
  }
}

// Log the values for debugging (mask sensitive data)
console.log('[AuthService Config] Environment Variables Check:');
console.log(`- NODE_ENV: ${env}`);
console.log(`- PORT: ${process.env.PORT || 3001}`);
console.log(`- RAZORPAY_KEY_ID: ${process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 8) + '...' : 'MISSING'}`);
console.log(`- RAZORPAY_KEY_SECRET: ${process.env.RAZORPAY_KEY_SECRET ? 'SET (length: ' + process.env.RAZORPAY_KEY_SECRET.length + ')' : 'MISSING'}`);
console.log(`- SUBSCRIPTION_PRICE: ${process.env.SUBSCRIPTION_PRICE || 'MISSING'}`);

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h', // Access token expiry
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Refresh token expiry
  TOKEN_AUDIENCE: process.env.TOKEN_AUDIENCE || 'Shikshaarthi-users',
  TOKEN_ISSUER: process.env.TOKEN_ISSUER || 'Shikshaarthi',

  AUTH_MONGO_URI: process.env.AUTH_MONGO_URI,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY, // For internal service communication

  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || 'shivanisrichippa@gmail.com',
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || '123456789',
  
  // Razorpay configuration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_3hSgAjDxJUVMlh',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'ScQiQP7ccJHH6gmkkU7kif3h',
  SUBSCRIPTION_PRICE: parseFloat(process.env.SUBSCRIPTION_PRICE) || 199,
  SUBSCRIPTION_DURATION_DAYS: parseInt(process.env.SUBSCRIPTION_DURATION_DAYS) || 365,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  PORT: process.env.PORT || 3001,
  NODE_ENV: env,
  SERVICE_NAME: process.env.SERVICE_NAME || 'auth-service',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || (15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173', // Default for local dev

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,


  LOCATIONIQ_API_KEY: process.env.LOCATIONIQ_API_KEY || 'pk.e4d111b79f5b9b99353735d425bd6cff', // Default for local dev

  // Supercoin related (defaults, can be overridden by env)
  COINS_LOGIN_BONUS: parseInt(process.env.COINS_LOGIN_BONUS, 10) || 50,
  COINS_RENTAL_ROOM: parseInt(process.env.COINS_RENTAL_ROOM, 10) || 20,
  COINS_MESS_SERVICE: parseInt(process.env.COINS_MESS_SERVICE, 10) || 15,
  COINS_HEALTHCARE_SERVICE: parseInt(process.env.COINS_HEALTHCARE_SERVICE, 10) || 10,
  COINS_HOUSEHOLD_SERVICE: parseInt(process.env.COINS_HOUSEHOLD_SERVICE, 10) || 15,
};