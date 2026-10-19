// backend/laundry-service/src/routes/laundry.routes.js
const express = require('express');
const router = express.Router();
const laundryController = require('../controllers/laundry.controller');

// Route to get laundries based on user's proximity
router.get('/nearby', laundryController.getNearbyLaundries);

// Route to get a specific laundry service's details
router.get('/:id', laundryController.getLaundryById);

module.exports = router;