//rental-service/src/config/index.js
// ========================================================================
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'env', `${process.env.NODE_ENV || 'development'}.env`) });

const config = {
    PORT: process.env.PORT || 3003,
    NODE_ENV: process.env.NODE_ENV || 'development',
    SERVICE_NAME: process.env.SERVICE_NAME || 'Rental Service',
    
    // --- CORRECTED ---
    // The key in your .env file is MONGO_URI, not RENTAL_DB_URI
    MONGO_URI: process.env.MONGO_URI, 
    
    // This is correct as it matches your .env file
    REWARDS_DB_URI: process.env.REWARDS_DB_URI, 

    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
};

// Validate required environment variables
const requiredVars = ['MONGO_URI', 'REWARDS_DB_URI', 'AUTH_SERVICE_URL', 'INTERNAL_API_KEY'];
const missingVars = requiredVars.filter(v => !config[v]);

if (missingVars.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables in rental-service: ${missingVars.join(', ')}`);
    process.exit(1);
}

console.log(`[${config.SERVICE_NAME}] Configuration loaded successfully`);
console.log(`[${config.SERVICE_NAME}] PORT: ${config.PORT}`);
console.log(`[${config.SERVICE_NAME}] MONGO_URI: SET`);
console.log(`[${config.SERVICE_NAME}] REWARDS_DB_URI: SET`);

module.exports = config;