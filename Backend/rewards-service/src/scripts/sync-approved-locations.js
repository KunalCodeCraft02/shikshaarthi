// Backend/rewards-service/src/scripts/sync-approved-locations.js (THE FINAL VERSION)
require('../config');
const mongoose = require('mongoose');
const { connectAllDBs, getDbConnection } = require('../config/db');
const CentralSubmissionModule = require('../models/CentralSubmission.model');
const { getServiceModel } = require('../utils/service-model.util');
const logger = require('../config/logger');

// Define the schema for the LIVE rental data directly inside the script.
const liveRentalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    status: { type: String, default: 'available' }
}, { timestamps: true, collection: 'rentals', strict: false });


const syncLocations = async () => {
    logger.info('===== STARTING SYNC SCRIPT FOR APPROVED SUBMISSIONS =====');
    await connectAllDBs();
    await new Promise(resolve => setTimeout(resolve, 3000));

    let LiveRentalModel;
    try {
        const rentalConnection = getDbConnection('rental');
        if (rentalConnection) {
            LiveRentalModel = rentalConnection.models['Rental'] || rentalConnection.model('Rental', liveRentalSchema);
            logger.info('Live "Rental" model is ready.');
        } else {
            throw new Error('Rental service DB connection not found.');
        }
    } catch (e) {
        if (e.name === 'OverwriteModelError') {
             const rentalConnection = getDbConnection('rental');
             LiveRentalModel = rentalConnection.model('Rental');
             logger.warn('Live "Rental" model was already registered. Re-using it.');
        } else {
            logger.error('FATAL: Error during live model registration:', { message: e.message });
            process.exit(1);
        }
    }

    const CentralSubmission = CentralSubmissionModule.getModel();
    const verifiedSubmissions = await CentralSubmission.find({ status: 'verified', serviceType: 'rental' }).lean();

    if (verifiedSubmissions.length === 0) {
        logger.info('✅ No verified "rental" submissions found to sync. Exiting.');
        await mongoose.disconnect();
        return;
    }

    logger.info(`Found ${verifiedSubmissions.length} verified "rental" submissions to check.`);
    let syncedCount = 0, notFoundCount = 0, alreadySyncedCount = 0, errorCount = 0;

    for (const submission of verifiedSubmissions) {
        try {
            const SourceModel = getServiceModel('rental');
            if (!SourceModel) continue;

            const sourceData = await SourceModel.findById(submission.serviceDataId).lean();
            if (!sourceData || !sourceData.location || !sourceData.location.coordinates) {
                logger.warn(`[SKIP] Source data or location missing for submission ${submission._id}`);
                continue;
            }

            // ============================= THE FINAL FIX =============================
            // Find the live document using ONLY the name, case-insensitively.
            // This is the most reliable way to find the matching document for a one-time script.
            const liveDocument = await LiveRentalModel.findOne({
                name: { $regex: new RegExp(`^${sourceData.name.trim()}$`, 'i') }
            });
            // =======================================================================

            if (!liveDocument) {
                notFoundCount++;
                logger.warn(`[NOT FOUND] Live document for submission ${submission._id} (name: ${sourceData.name})`);
                continue;
            }

            if (liveDocument.location && liveDocument.location.coordinates.length > 0 && liveDocument.location.coordinates[0] !== 0) {
                alreadySyncedCount++;
                continue;
            }
            
            liveDocument.location = sourceData.location;
            liveDocument.status = 'available';
            await liveDocument.save();

            syncedCount++;
            logger.info(`[SUCCESS] Synced location for live document ${liveDocument._id} (name: ${liveDocument.name})`);

        } catch (error) {
            errorCount++;
            logger.error(`[ERROR] Failed to process submission ${submission._id}: ${error.message}`);
        }
    }

    logger.info('\n===== SYNC SUMMARY =====');
    logger.info(`✅ Successfully Synced: ${syncedCount}`);
    logger.info(`- Already Synced: ${alreadySyncedCount}`);
    logger.info(`- Not Found in Live DB: ${notFoundCount}`);
    logger.info(`❌ Errors during sync: ${errorCount}`);

    await mongoose.disconnect();
};

syncLocations().catch(err => {
    logger.error("A fatal error occurred during the sync script:", err);
    process.exit(1);
});