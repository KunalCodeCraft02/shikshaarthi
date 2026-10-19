// plumber-service/src/routes/plumber.routes.js
const express = require('express');
const router = express.Router();
const plumberController = require('../controllers/plumber.controller');

// Route to get plumbers based on user's proximity
router.get('/nearby', plumberController.getNearbyPlumbers);

// Route to get a specific plumber's details
router.get('/:id', plumberController.getPlumberById);

module.exports = router;