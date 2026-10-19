const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const Medical = require('../models/medical.model');
const config = require('../config');
const logger = require('../config/logger');
// Note: Interest/notification logic would be added here in a future step.

// exports.getNearbyMedicalServices = async (req, res) => {
//     try {
//         const userId = req.headers['x-user-id'];
//         if (!userId) {
//             return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not identified." });
//         }
        
//         const { data: userData } = await axios.get(
//             `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`,
//             { headers: { 'x-internal-api-key': config.INTERNAL_API_KEY } }
//         );

//         const user = userData.user;
//         if (!user.location?.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
//             return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set." });
//         }
        
//         const radiusInKm = parseInt(req.query.radius, 10) || 5;
//         const distanceInMeters = Math.min(radiusInKm, 20) * 1000;
        
//         const nearbyServices = await Medical.find({
//             location: {
//                 $near: {
//                     $geometry: { type: "Point", coordinates: user.location.coordinates },
//                     $maxDistance: distanceInMeters
//                 }
//             }
//         });

//         res.status(StatusCodes.OK).json({ 
//             success: true, 
//             count: nearbyServices.length,
//             data: nearbyServices 
//         });

    // } catch (error) {
    //     const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
    //     const message = error.response?.data?.message || "Failed to fetch medical data.";
    //     logger.error("Error in getNearbyMedicalServices", { error: error.message });
    //     res.status(status).json({ message });
    // }
// };

exports.getNearbyMedicalServices = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not identified. Access denied." });
        }
        
        const { data: userData } = await axios.get(/* ... fetch user ... */);

        const user = userData.user;
        if (!user.location?.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set. Please update your profile." });
        }
        
        const radiusInKm = parseInt(req.query.radius, 10) || 5;
        const distanceInMeters = Math.min(radiusInKm, 25) * 1000;
        
        // Find verified medical facilities near the user's location
        const nearbyMedicals = await Medical.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: user.location.coordinates },
                    $maxDistance: distanceInMeters
                }
            },
            verificationStatus: 'verified' // Only show verified facilities
        });

        res.status(StatusCodes.OK).json({ 
            success: true, 
            count: nearbyMedicals.length,
            data: nearbyMedicals 
        });

    }catch (error) {
            const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
            const message = error.response?.data?.message || "Failed to fetch medical data.";
            logger.error("Error in getNearbyMedicalServices", { error: error.message });
            res.status(status).json({ message });
    }
};
exports.getMedicalServiceById = async (req, res) => {
    try {
        const service = await Medical.findById(req.params.id);
        if (!service) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Medical service not found." });
        }
        res.status(StatusCodes.OK).json({ success: true, data: service });
    } catch (error) {
        logger.error("Error in getMedicalServiceById", { error: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch details." });
    }
};