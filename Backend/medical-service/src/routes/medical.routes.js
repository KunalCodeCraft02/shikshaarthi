const express = require('express');
const router = express.Router();
const medicalController = require('../controllers/medical.controller');

router.get('/nearby', medicalController.getNearbyMedicalServices);
router.get('/:id', medicalController.getMedicalServiceById);
// Interest route would be added here later: router.post('/:id/interest', ...);

module.exports = router;