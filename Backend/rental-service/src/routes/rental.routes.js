
//backend/rental-service/src/routes/rental.routes.js
const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rental.controller');

// --- User Facing Routes ---
router.get('/nearby', rentalController.getNearbyRentals);
router.get('/:id', rentalController.getRentalById);
router.post('/:id/interest', rentalController.expressInterest);

// Admin-facing routes for this service are not needed for this feature,
// as the rewards-service will be the single source for admin notification data.

module.exports = router;