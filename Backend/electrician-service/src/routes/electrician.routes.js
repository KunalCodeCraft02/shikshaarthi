
// =====================================================================

// electrician-service/src/routes/electrician.routes.js
const express = require('express');
const router = express.Router();
const electricianController = require('../controllers/electrician.controller');

// Route to get electricians based on user's proximity
router.get('/nearby', electricianController.getNearbyElectricians);

// Route to get a specific electrician's details
router.get('/:id', electricianController.getElectricianById);

module.exports = router;
