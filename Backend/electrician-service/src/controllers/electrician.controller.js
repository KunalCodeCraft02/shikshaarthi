// electrician-service/src/controllers/electrician.controller.js

const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const Electrician = require('../models/electrician.model');
const config = require('../config');
const logger = require('../config/logger');

/**
 * @description Get nearby verified and active electricians based on user location.
 * @route GET /api/electrician/nearby
 */
exports.getNearbyElectricians = async (req, res) => {
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
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set. Please update your profile to find nearby electricians." });
        }

        const radiusInKm = parseInt(req.query.radius, 10) || 10;
        const distanceInMeters = Math.min(radiusInKm, 25) * 1000; // Cap at 25km

        const nearbyElectricians = await Electrician.find({
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
            count: nearbyElectricians.length,
            data: nearbyElectricians
        });

    } catch (error) {
        const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || "Failed to fetch electrician data.";
        logger.error("Error in getNearbyElectricians", { errorMessage: error.message, stack: error.stack });
        res.status(status).json({ message });
    }
};

/**
 * @description Get a single electrician by their ID. Ensures the electrician is verified.
 * @route GET /api/electrician/:id
 */
exports.getElectricianById = async (req, res) => {
    try {
        const electrician = await Electrician.findById(req.params.id);

        if (!electrician || electrician.verificationStatus !== 'verified') {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Electrician not found or not verified."
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            data: electrician
        });

    } catch (error) {
        logger.error("Error in getElectricianById", { errorMessage: error.message, electricianId: req.params.id });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to fetch electrician details."
        });
    }
};
