const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const Mess = require('../models/mess.model');
const MessInterest = require('../models/mess-interest.model');
const config = require('../config');
const logger = require('../config/logger');
const notificationService = require('../services/notification.service');
exports.getNearbyMesses = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not identified. Access denied." });
        }
        
        const { data: userData } = await axios.get(
            `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`,
            { headers: { 'x-internal-api-key': config.INTERNAL_API_KEY } }
        );

        const user = userData.user;
        if (!user.location?.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set. Please update your profile." });
        }
        
        const radiusInKm = parseInt(req.query.radius, 10) || 5; // Default 5km for messes
        const distanceInMeters = Math.min(radiusInKm, 20) * 1000;
        
        // ====================== QUERY MODIFIED HERE ======================
        // Find verified messes near the user's location
        const nearbyMesses = await Mess.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: user.location.coordinates },
                    $maxDistance: distanceInMeters
                }
            },
            verificationStatus: 'verified' // Only show verified messes
        });
        // ================================================================

        res.status(StatusCodes.OK).json({ 
            success: true, 
            count: nearbyMesses.length,
            data: nearbyMesses 
        });

    } catch (error) {
        const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || "Failed to fetch mess data.";
        logger.error("Error in getNearbyMesses", { error: error.message });
        res.status(status).json({ message });
    }
};

exports.getMessById = async (req, res) => {
    try {
        const mess = await Mess.findById(req.params.id);
        if (!mess) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Mess not found." });
        }
        res.status(StatusCodes.OK).json({ success: true, data: mess });
    } catch (error) {
        logger.error("Error in getMessById", { error: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch mess details." });
    }
};

exports.expressInterest = async (req, res) => {
    const { id: messId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not identified." });
    }

    try {
        const mess = await Mess.findById(messId).lean();
        if (!mess) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Mess not found." });
        }

        const { data: userData } = await axios.get(
            `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`,
            { headers: { 'x-internal-api-key': config.INTERNAL_API_KEY } }
        );
        const user = userData.user;

        const newInterest = await MessInterest.findOneAndUpdate(
            { userId: user._id, messId: mess._id },
            { 
                $setOnInsert: {
                    userId: user._id,
                    messId: mess._id,
                    userName: user.fullName,
                    userEmail: user.email,
                    messName: mess.name,
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        setImmediate(() => {
            notificationService.createMessInterestNotification(user, mess)
                .catch(err => logger.error('Background notification failed:', { error: err.message }));
        });

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: "Interest in mess recorded successfully. The owner will be notified.",
            data: { interestId: newInterest._id }
        });

    } catch (error) {
        logger.error("[Express Interest] Error:", { error: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "An internal server error occurred." });
    }
};