const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'env', `${process.env.NODE_ENV || 'development'}.env`) });

const config = {
    PORT: process.env.PORT || 3007,
    NODE_ENV: process.env.NODE_ENV || 'development',
    SERVICE_NAME: process.env.SERVICE_NAME || 'Electrician Service',
    MONGO_URI: process.env.MONGO_URI,
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
};

const requiredVars = ['MONGO_URI', 'AUTH_SERVICE_URL', 'INTERNAL_API_KEY'];
const missingVars = requiredVars.filter(v => !config[v]);

if (missingVars.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables in electrician-service: ${missingVars.join(', ')}`);
    process.exit(1);
}

module.exports = config;