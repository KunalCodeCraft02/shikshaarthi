
// backend/rental-service/src/controllers/rental.controller.js
const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const Rental = require('../models/rental.model');
const config = require('../config');
const logger = require('../config/logger');
const notificationService = require('../services/notification.service');
const RentalInterest = require('../models/rental-interest.model');

// exports.getNearbyRentals = async (req, res) => {
//     try {
//         const userId = req.headers['x-user-id'];
//         if (!userId) {
//             return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not identified. Access denied." });
//         }
        
//         const { data: userData } = await axios.get(
//             `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`,
//             { headers: { 'x-internal-api-key': config.INTERNAL_API_KEY } }
//         );

//         const user = userData.user;
//         if (!user.location || !user.location.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
//             return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set. Please update your profile." });
//         }
        
//         const radiusInKm = parseInt(req.query.radius, 10) || 2;
//         const distanceInMeters = Math.min(radiusInKm, 20) * 1000;
        
//         const nearbyRentals = await Rental.find({
//             location: {
//                 $near: {
//                     $geometry: { type: "Point", coordinates: user.location.coordinates },
//                     $maxDistance: distanceInMeters
//                 }
//             }
//         });

//         res.status(StatusCodes.OK).json({ 
//             success: true, 
//             count: nearbyRentals.length,
//             data: nearbyRentals 
//         });

//     } catch (error) {
//         const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
//         const message = error.response?.data?.message || "Failed to fetch rental data.";
//         logger.error("Error in getNearbyRentals", { error: error.message, stack: error.stack });
//         res.status(status).json({ message });
//     }
// };
exports.getNearbyRentals = async (req, res) => {
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
        if (!user.location || !user.location.coordinates || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Your location is not set. Please update your profile." });
        }
        
        const radiusInKm = parseInt(req.query.radius, 10) || 2;
        const distanceInMeters = Math.min(radiusInKm, 20) * 1000;
        
        // ====================== QUERY MODIFIED HERE ======================
        // Find verified rentals near the user's location
        const nearbyRentals = await Rental.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: user.location.coordinates },
                    $maxDistance: distanceInMeters
                }
            },
            verificationStatus: 'verified' // Only show verified rentals
        });
        // ================================================================

        res.status(StatusCodes.OK).json({ 
            success: true, 
            count: nearbyRentals.length,
            data: nearbyRentals 
        });

    } catch (error) {
        const status = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || "Failed to fetch rental data.";
        logger.error("Error in getNearbyRentals", { error: error.message, stack: error.stack });
        res.status(status).json({ message });
    }
};
exports.getRentalById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid rental ID format." });
        }
        const rental = await Rental.findById(id);
        if (!rental) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Rental not found." });
        }
        res.status(StatusCodes.OK).json({ success: true, data: rental });
    } catch (error) {
        logger.error("Error in getRentalById", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch rental details." });
    }
};

// REVISED AND SIMPLIFIED expressInterest CONTROLLER FOR DEBUGGING
exports.expressInterest = async (req, res) => {
    const { id: rentalId } = req.params;
    const userId = req.headers['x-user-id'];

    logger.info(`[Interest] START: Request for rentalId: ${rentalId} from userId: ${userId}`);

    if (!userId) {
        logger.error('[Interest] FAIL: Missing x-user-id header.');
        return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not identified." });
    }

    if (!rentalId || !rentalId.match(/^[0-9a-fA-F]{24}$/)) {
        logger.error(`[Interest] FAIL: Invalid rentalId format: ${rentalId}`);
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid rental ID." });
    }

    try {
        // 1. Find the Rental Listing
        logger.info(`[Interest] STEP 1: Finding rental with ID: ${rentalId}`);
        const rental = await Rental.findById(rentalId).lean();

        if (!rental) {
            logger.error(`[Interest] FAIL: Rental not found with ID: ${rentalId}`);
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Rental not found." });
        }
        logger.info(`[Interest] SUCCESS: Found rental: "${rental.name}"`);

        // 2. Fetch User Details from Auth Service
        logger.info(`[Interest] STEP 2: Fetching user details for userId: ${userId}`);
        const userResponse = await axios.get(
            `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`,
            { headers: { 'x-internal-api-key': config.INTERNAL_API_KEY } }
        );

        const user = userResponse.data?.user;
        if (!user || !user._id) {
            logger.error('[Interest] FAIL: User data from auth service is invalid.', { receivedData: userResponse.data });
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User could not be verified." });
        }
        logger.info(`[Interest] SUCCESS: Found user: "${user.fullName}"`);

        // 3. Create and Save the New Interest Document (using findOneAndUpdate as an "upsert")
        const query = { userId: user._id, rentalId: rental._id };
        const update = { 
            $setOnInsert: { // These fields are only set when a new document is created
                userId: user._id,
                rentalId: rental._id,
                userName: user.fullName,
                userEmail: user.email,
                rentalName: rental.name,
            }
        };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };
        
        logger.info('[Interest] STEP 3: Attempting to find or create interest document.');
        const newInterest = await RentalInterest.findOneAndUpdate(query, update, options);
        logger.info('[Interest] SUCCESS: Interest document operation complete!', { interestId: newInterest._id });

        // 4. Send Notification
        setImmediate(() => {
            notificationService.createRentalInterestNotification(user, rental)
                .catch(err => logger.error('[Interest] Notification failed in background:', { error: err.message }));
        });

        // 5. Respond to Client
        return res.status(StatusCodes.CREATED).json({
            success: true,
            message: "Interest recorded successfully.",
            data: { interestId: newInterest._id }
        });

    } catch (error) {
        logger.error("[Interest] CATCH_BLOCK: An unhandled error occurred.", {
            error: error.message,
            stack: error.stack,
            axiosResponse: error.response?.data
        });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "An internal server error occurred." });
    }
};