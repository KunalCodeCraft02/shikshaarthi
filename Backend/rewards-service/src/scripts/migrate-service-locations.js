// Backend/rewards-service/src/scripts/migrate-service-locations.js (Final Corrected Version)
require('../config'); // Load environment variables
const mongoose = require('mongoose');
const axios = require('axios');
const { connectAllDBs, getDbConnection } = require('../config/db');
const { getServiceModel } = require('../utils/service-model.util');
const config = require('../config');
const logger = require('../config/logger');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const geocodeAndMigrate = async (serviceType) => {
  logger.info(`\n--- Starting Migration for: ${serviceType.toUpperCase()} ---`);

  const connection = getDbConnection(serviceType === 'rewards' ? 'rewards' : serviceType);
  if (!connection || connection.readyState !== 1) {
    logger.error(`Connection for service "${serviceType}" is not ready. Skipping migration.`);
    return { success: 0, errors: 1 };
  }

  const ServiceModel = getServiceModel(serviceType);
  if (!ServiceModel) {
    logger.error(`Could not get model for service type "${serviceType}". Skipping.`);
    return { success: 0, errors: 1 };
  }

  const documentsToMigrate = await ServiceModel.find({ location: { $exists: false } });

  if (documentsToMigrate.length === 0) {
    logger.info(`✅ All documents in "${serviceType}" are already migrated.`);
    return { success: 0, errors: 0 };
  }

  logger.info(`Found ${documentsToMigrate.length} documents to migrate for "${serviceType}".`);
  let successCount = 0;
  let errorCount = 0;

  for (const doc of documentsToMigrate) {
    try {
      const addressString = `${doc.address}, ${doc.district}, ${doc.pincode}, ${doc.state || 'Maharashtra'}, India`;
      logger.info(`Geocoding address for ${doc.name}: "${addressString}"`);
      const geoResponse = await axios.get('https://us1.locationiq.com/v1/search.php', {
        params: { key: config.LOCATIONIQ_API_KEY, q: addressString, format: 'json', limit: 1 }
      });
      if (geoResponse.data && geoResponse.data.length > 0) {
        const { lat, lon } = geoResponse.data[0];
        const location = { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] };
        await ServiceModel.updateOne({ _id: doc._id }, { $set: { location: location } });
        successCount++;
        logger.info(`  -> SUCCESS: Migrated location for "${doc.name}"`);
      } else {
        logger.warn(`  -> FAILED: No geocoding result for "${doc.name}"`);
        errorCount++;
      }
    } catch (e) {
      logger.error(`  -> ERROR migrating document ${doc._id} ("${doc.name}"): ${e.message}`);
      errorCount++;
    }
    await delay(1100);
  }

  logger.info(`--- Migration for ${serviceType.toUpperCase()} COMPLETE ---`);
  logger.info(`  -> Success: ${successCount}, Errors/Failures: ${errorCount}`);
  return { success: successCount, errors: errorCount };
};

const runAllMigrations = async () => {
    logger.info('===== STARTING ALL SERVICE DATA MIGRATIONS =====');
    await connectAllDBs();

    // ====================================================================
    // THE FIX: Add a small delay here to allow connections to stabilize.
    // ====================================================================
    logger.info('Waiting for 3 seconds for DB connections to stabilize...');
    await delay(3000); // 3-second delay

    const serviceTypes = ['rental', 'mess', 'medical', 'plumber', 'electrician', 'laundry'];
    const totalStats = { success: 0, errors: 0 };

    for (const type of serviceTypes) {
        const stats = await geocodeAndMigrate(type);
        totalStats.success += stats.success;
        totalStats.errors += stats.errors;
    }

    logger.info('\n===== OVERALL MIGRATION SUMMARY =====');
    logger.info(`✅ Total documents migrated: ${totalStats.success}`);
    logger.info(`❌ Total errors/failures: ${totalStats.errors}`);
    logger.info('=====================================');

    await Promise.all(Object.values(mongoose.connections).map(c => c.close()));
    logger.info('All MongoDB connections closed.');
    process.exit(0);
};

runAllMigrations().catch(err => {
    logger.error("A fatal error occurred during the migration process:", err);
    process.exit(1);
});