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
        messId: mongoose.Schema.Types.ObjectId,
        messName: String,
    }
}, { timestamps: true, collection: 'admin_notifications' });

let rewardsDbConnection;
let AdminNotification;

const connectToRewardsDb = () => {
    if (rewardsDbConnection && rewardsDbConnection.readyState === 1) return;
    rewardsDbConnection = mongoose.createConnection(config.REWARDS_DB_URI);
    rewardsDbConnection.on('error', (err) => logger.error('Rewards DB connection error:', err));
    rewardsDbConnection.once('open', () => {
        logger.info('Successfully connected to Rewards DB from mess-service.');
        AdminNotification = rewardsDbConnection.model('AdminNotification', adminNotificationSchema);
    });
};

connectToRewardsDb();

exports.createMessInterestNotification = async (user, mess) => {
    if (!AdminNotification) {
        logger.error('AdminNotification model not ready. Cannot create notification.');
        return;
    }
    try {
        const notification = new AdminNotification({
            type: 'mess_interest',
            message: `${user.fullName || 'A user'} showed interest in the mess: "${mess.name}".`,
            metadata: {
                userId: user._id,
                userName: user.fullName,
                userEmail: user.email,
                messId: mess._id,
                messName: mess.name,
            },
        });
        await notification.save();
        logger.info(`SUCCESS: Created mess interest notification for user ${user._id} and mess ${mess._id}`);
    } catch (error) {
        logger.error('Failed to create mess interest notification', { error: error.message });
    }
};