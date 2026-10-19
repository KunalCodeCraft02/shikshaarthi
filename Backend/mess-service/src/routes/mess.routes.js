//mess-service/src/routes/mess.routes.js
const express = require('express');
const router = express.Router();
const messController = require('../controllers/mess.controller');

router.get('/nearby', messController.getNearbyMesses);
router.get('/:id', messController.getMessById);
router.post('/:id/interest', messController.expressInterest);

module.exports = router;