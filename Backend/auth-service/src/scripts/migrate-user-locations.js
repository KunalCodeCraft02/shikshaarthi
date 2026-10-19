// Backend/auth-service/src/scripts/migrate-user-locations.js (IMPROVED VERSION)
const mongoose = require('mongoose');
require('../config');
const logger = require('../config/logger');
const User = require('../models/User');
const College = require('../models/College');

const migrateUserLocations = async () => {
  try {
    await mongoose.connect(process.env.AUTH_MONGO_URI);
    logger.info('MongoDB connected for user location migration.');

    const collegeCount = await College.countDocuments();
    if (collegeCount === 0) {
        logger.error('❌ No colleges found in database. Please run seed-colleges.js first.');
        return;
    }
    logger.info(`Found ${collegeCount} colleges in database.`);

    const usersToMigrate = await User.find({
      $or: [
        { location: { $exists: false } },
        { 'location.coordinates': [0, 0] }
      ]
    });

    if (usersToMigrate.length === 0) {
      logger.info('✅ All users have valid location data. No migration needed.');
      return;
    }

    logger.info(`Found ${usersToMigrate.length} users to migrate.`);
    let successCount = 0;
    let notFoundCount = 0;

    for (const user of usersToMigrate) {
      // --- START OF IMPROVEMENT ---
      if (!user.collegeName || user.collegeName.length < 3) {
          logger.warn(`[SKIPPED] User ${user.email} has an invalid or too short college name: "${user.collegeName}"`);
          notFoundCount++;
          continue;
      }
      // Use a case-insensitive regular expression for a more flexible match
      const college = await College.findOne({
        college: { $regex: new RegExp(user.collegeName, 'i') },
        district: user.district
      }).lean();
      // --- END OF IMPROVEMENT ---

      if (college && college.location) {
        // Update user with the found location AND the standardized college name
        await User.updateOne(
            { _id: user._id },
            { $set: { location: college.location, collegeName: college.college } }
        );
        successCount++;
        logger.info(`[SUCCESS] Migrated location for user: ${user.email} -> Matched with "${college.college}"`);
      } else {
        notFoundCount++;
        logger.warn(`[SKIPPED] Could not find college match for user: ${user.email} (Searching for: "${user.collegeName}")`);
      }
    }

    logger.info('\n--- USER LOCATION MIGRATION SUMMARY ---');
    logger.info(`✅ Successfully migrated: ${successCount} users`);
    logger.info(`⏭️  Skipped (No match found): ${notFoundCount} users`);

  } catch (error) {
    logger.error('❌ FATAL ERROR during user migration:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
  }
};

migrateUserLocations();