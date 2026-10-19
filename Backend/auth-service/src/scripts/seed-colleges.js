// Backend/auth-service/src/scripts/seed-colleges.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('../config'); // Load environment variables
const logger = require('../config/logger');
const College = require('../models/College'); // Import the model

const seedDatabase = async () => {
  try {
    if (!process.env.AUTH_MONGO_URI) {
      throw new Error('AUTH_MONGO_URI is not defined.');
    }
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.AUTH_MONGO_URI);
    logger.info('MongoDB connected successfully.');

    logger.info('Clearing existing `colleges` collection data...');
    await College.deleteMany({});
    logger.info('Existing data cleared.');

    const geocodedFilePath = path.join(__dirname, 'data', 'maharashtra-colleges-geocoded.json');
    if (!fs.existsSync(geocodedFilePath)) {
      throw new Error(`Geocoded data file not found: ${geocodedFilePath}`);
    }

    const geocodedData = JSON.parse(fs.readFileSync(geocodedFilePath, 'utf-8'));
    const validColleges = geocodedData.filter(c => c.location && c.location.coordinates);

    if (validColleges.length === 0) {
      throw new Error('No valid colleges found in geocoded file.');
    }

    logger.info(`Inserting ${validColleges.length} colleges...`);
    await College.insertMany(validColleges);
    logger.info(`✅ Successfully inserted ${validColleges.length} colleges.`);

  } catch (error) {
    logger.error('❌ Error during database seeding:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
  }
};

seedDatabase();