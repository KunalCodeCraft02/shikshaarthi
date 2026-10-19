//api-gateway/src/config.js
// ========================================================================
// FILE: api-gateway/src/config.js
// ========================================================================

require('dotenv').config();

const config = {
    PORT: process.env.PORT || 3000,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    REWARDS_SERVICE_URL: process.env.REWARDS_SERVICE_URL,

    RENTAL_SERVICE_URL: process.env.RENTAL_SERVICE_URL,
    MESS_SERVICE_URL: process.env.MESS_SERVICE_URL,
    MEDICAL_SERVICE_URL: process.env.MEDICAL_SERVICE_URL,
    PLUMBER_SERVICE_URL: process.env.PLUMBER_SERVICE_URL,
    ELECTRICIAN_SERVICE_URL: process.env.ELECTRICIAN_SERVICE_URL, // <-- ADD

    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    
    // JWT variables loaded from .env
    JWT_SECRET: process.env.JWT_SECRET,
    TOKEN_ISSUER: process.env.TOKEN_ISSUER,
    TOKEN_AUDIENCE: process.env.TOKEN_AUDIENCE,

    
};

// Validate that crucial configurations are present
const requiredVars = [
    'AUTH_SERVICE_URL',
    'REWARDS_SERVICE_URL',
    'RENTAL_SERVICE_URL',
    'MESS_SERVICE_URL',
    'MEDICAL_SERVICE_URL',
    'PLUMBER_SERVICE_URL',
    'ELECTRICIAN_SERVICE_URL', // <-- ADD
    'INTERNAL_API_KEY',
    'JWT_SECRET',
    'TOKEN_ISSUER',
    'TOKEN_AUDIENCE'
];

const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
    console.error(`FATAL ERROR: The following required environment variables are missing in the API Gateway .env file: ${missingVars.join(', ')}`);
    process.exit(1);
}

module.exports = config;