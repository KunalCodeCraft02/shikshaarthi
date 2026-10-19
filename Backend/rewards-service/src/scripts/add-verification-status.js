
require('../config'); 
const mongoose = require('mongoose');
const config = require('../config');

// --- Configuration ---
const MONGO_URI = "mongodb+srv://shivanisrichippa14:%24hiva14CH@cluster0.uyv1qf9.mongodb.net/reward-service?ssl=true&tlsInsecure=true&serverSelectionTimeoutMS=30000"; // Using the main URI from your rewards service

// List of all service-specific collection names
const collectionsToUpdate = [
    'electrician_data_submissions',
    'laundry_data_submissions',
    'medical_data_submissions',
    'mess_data_submissions',
    'plumber_data_submissions',
    'rental_data_submissions'
];

// --- Main Migration Function ---
const runMigration = async () => {
    if (!MONGO_URI) {
        console.error('🔴 ERROR: MONGO_URI is not defined. Make sure your .env file is correctly referenced.');
        return;
    }

    let connection;
    try {
        console.log('Connecting to MongoDB...');
        connection = await mongoose.connect(MONGO_URI, {
            // No need for deprecated options like useNewUrlParser
        });
        console.log('✅ MongoDB connected successfully.');
        console.log('-----------------------------------');

        for (const collectionName of collectionsToUpdate) {
            console.log(`\nProcessing collection: "${collectionName}"...`);

            const collection = connection.connection.collection(collectionName);

            // Find documents that DO NOT have the 'verificationStatus' field
            const filter = { verificationStatus: { $exists: false } };

            // The update to apply: set the new field to 'pending'
            const updateDoc = { $set: { verificationStatus: 'pending' } };

            // Perform the update on all matching documents
            const result = await collection.updateMany(filter, updateDoc);

            if (result.matchedCount === 0) {
                console.log(`🟢 No documents needed updating in "${collectionName}".`);
            } else {
                console.log(`🔵 Matched ${result.matchedCount} documents and updated ${result.modifiedCount} in "${collectionName}".`);
            }
        }
        
        console.log('\n-----------------------------------');
        console.log('✅ Migration completed successfully for all collections!');

    } catch (error) {
        console.error('🔴 A critical error occurred during the migration:', error);
    } finally {
        if (connection) {
            await connection.disconnect();
            console.log('🔌 MongoDB connection closed.');
        }
    }
};

// --- Execute the Script ---
runMigration();