//backend/plumber-service/src/controllers/plumber.controller.js
const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const Plumber = require('../models/plumber.model');
const config = require('../config');
const logger = require('../config/logger');

exports.getNearbyPlumbers = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not identified. Access denied." });
        }
        
        // Fetch user's location from the auth-service
        const { data: userData } = await axios.get(
            `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`,
            { headers: { 'x-internal-api-key': config.INTERNAL_API_KEY } }
        );

        const user = userData.user;
        if (!user.location?.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set. Please update your profile to find nearby plumbers." });
        }
        
        const radiusInKm = parseInt(req.query.radius, 10) || 10; // Default 10km for plumbers
        const distanceInMeters = Math.min(radiusInKm, 25) * 1000; // Cap at 25km
        
        // Find verified and active plumbers near the user's location
        const nearbyPlumbers = await Plumber.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: user.location.coordinates },
                    $maxDistance: distanceInMeters
                }
            },
            verificationStatus: 'verified', // Only show verified plumbers
            isActive: true
        });

        res.status(StatusCodes.OK).json({ 
            success: true, 
            count: nearbyPlumbers.length,
            data: nearbyPlumbers 
        });

    } catch (error) {
        const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || "Failed to fetch plumber data.";
        logger.error("Error in getNearbyPlumbers", { errorMessage: error.message });
        res.status(status).json({ message });
    }
};

// ====================== CODE FOR getPlumberById ======================
/**
 * @description Get a single plumber by their ID. Ensures the plumber is verified.
 * @route GET /api/plumber/:id
 */
exports.getPlumberById = async (req, res) => {
    try {
        const plumber = await Plumber.findById(req.params.id);

        // Crucially, check if the plumber exists AND is verified.
        // This prevents users from accessing profiles of unverified plumbers.
        if (!plumber || plumber.verificationStatus !== 'verified') {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false, 
                message: "Plumber not found or not verified." 
            });
        }

        res.status(StatusCodes.OK).json({ 
            success: true, 
            data: plumber 
        });

    } catch (error) {
        logger.error("Error in getPlumberById", { errorMessage: error.message, plumberId: req.params.id });
        
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: "Failed to fetch plumber details." 
        });
    }
};
// =====================================================================