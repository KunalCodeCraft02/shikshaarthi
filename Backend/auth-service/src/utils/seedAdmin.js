// auth-service/src/utils/seedAdmin.js
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const config = require('../config');
const logger = require('../config/logger');

const seedInitialAdmin = async () => {
  try {
    const initialAdminEmail = (config.INITIAL_ADMIN_EMAIL || 'shivanisrichippa@gmail.com').toLowerCase();
    const initialAdminPassword = config.INITIAL_ADMIN_PASSWORD || '123456789';
    const existingAdmin = await Admin.findOne({ email: initialAdminEmail });

    if (existingAdmin) {
      logger.info(`[AdminSeeder] Initial admin already exists: ${initialAdminEmail}. Skipping seeding.`);
      return;
    }

    // Default admin credentials (use environment variables in production)
    // Create the initial admin
    const initialAdmin = new Admin({
      email: initialAdminEmail,
      password: initialAdminPassword,
    });

    await initialAdmin.save();
    logger.info(`[AdminSeeder] Initial admin created successfully: ${initialAdminEmail}`);
    
  } catch (error) {
    logger.error('[AdminSeeder] Error creating initial admin:', {
      message: error.message,
      stack: error.stack
    });
    // Don't throw error to prevent server startup failure
    console.error('Failed to seed initial admin, but continuing server startup...');
  }
};

module.exports = { seedInitialAdmin };