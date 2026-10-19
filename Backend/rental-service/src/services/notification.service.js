//rental-service/src/services/notification.service.js
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

const adminNotificationSchema = new mongoose.Schema({
    type: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    isRead: { type: Boolean, default: false },
    metadata: {
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        userEmail: String,
        rentalId: mongoose.Schema.Types.ObjectId,
        rentalName: String,
    }
}, { timestamps: true, collection: 'admin_notifications' });

let rewardsDbConnection;
let AdminNotification;

const connectToRewardsDb = () => {
  if (rewardsDbConnection && rewardsDbConnection.readyState === 1) {
    logger.info('Rewards DB connection already established.');
    return;
  }
  
  logger.info('Connecting to Rewards DB for notification service...');
  
  rewardsDbConnection = mongoose.createConnection(config.REWARDS_DB_URI);

  rewardsDbConnection.on('error', (err) => logger.error('Rewards DB connection error:', err));
  
  rewardsDbConnection.once('open', () => {
    logger.info('Successfully connected to Rewards DB from rental-service.');
    AdminNotification = rewardsDbConnection.model('AdminNotification', adminNotificationSchema);
    logger.info('AdminNotification model compiled successfully.');
  });
};

connectToRewardsDb();

exports.createRentalInterestNotification = async (user, rental) => {
    try {
        if (!AdminNotification) {
            logger.error('AdminNotification model is not ready. Cannot create notification. Retrying in 2s...');
            // Simple retry logic for race conditions on startup
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (!AdminNotification) {
                 logger.error('AdminNotification model still not ready. Aborting notification.');
                 return;
            }
        }

        const notification = new AdminNotification({
            type: 'rental_interest',
            message: `${user.fullName || 'A user'} showed interest in the rental: "${rental.name}".`,
            metadata: {
                userId: user._id,
                userName: user.fullName,
                userEmail: user.email,
                rentalId: rental._id,
                rentalName: rental.name
            },
            link: `/admin/services/rental/interest/${rental._id}`
        });

        await notification.save();
        logger.info(`SUCCESS: Created rental interest notification for user ${user._id} and rental ${rental._id}`);
        
    } catch (error) {
        logger.error('Failed to create rental interest notification', { 
            error: error.message,
            stack: error.stack,
        });
    }
};