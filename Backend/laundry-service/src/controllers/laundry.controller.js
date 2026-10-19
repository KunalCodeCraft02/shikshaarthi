// backend/laundry-service/src/controllers/laundry.controller.js
const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const Laundry = require('../models/laundry.model');
const config = require('../config');
const logger = require('../config/logger');

exports.getNearbyLaundries = async (req, res) => {
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
        
        const radiusInKm = parseInt(req.query.radius, 10) || 5; // Default 5km for laundry
        const distanceInMeters = Math.min(radiusInKm, 20) * 1000; // Cap at 20km
        
        const nearbyLaundries = await Laundry.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: user.location.coordinates },
                    $maxDistance: distanceInMeters
                }
            },
            verificationStatus: 'verified',
            isActive: true
        });

        res.status(StatusCodes.OK).json({ 
            success: true, 
            count: nearbyLaundries.length,
            data: nearbyLaundries 
        });

    } catch (error) {
        const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || "Failed to fetch laundry data.";
        logger.error("Error in getNearbyLaundries", { errorMessage: error.message });
        res.status(status).json({ message });
    }
};

// ====================== ADDED: getLaundryById method ======================
/**
 * @description Get a single laundry service by their ID. Ensures the service is verified.
 * @route GET /api/laundry/:id
 */
exports.getLaundryById = async (req, res) => {
    try {
        const laundry = await Laundry.findById(req.params.id);

        // Check if the laundry exists AND is verified.
        // This prevents users from accessing profiles of unverified laundries.
        if (!laundry || laundry.verificationStatus !== 'verified') {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false, 
                message: "Laundry service not found or not verified." 
            });
        }

        res.status(StatusCodes.OK).json({ 
            success: true, 
            data: laundry 
        });

    } catch (error) {
        logger.error("Error in getLaundryById", { errorMessage: error.message, laundryId: req.params.id });
        
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: "Failed to fetch laundry service details." 
        });
    }
};
// =====================================================================