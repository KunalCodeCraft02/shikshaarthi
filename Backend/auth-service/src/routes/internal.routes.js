
// ========================================================================
// FILE: auth-service/src/routes/internal.routes.js (FULL CORRECTED CODE)
// ========================================================================

const express = require('express');
const User = require('../models/User'); 
const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');
const internalAuthMiddleware = require('../middleware/internalAuth.middleware');
const mongoose = require('mongoose');
const internalController = require('../controllers/internal.controller');


const router = express.Router();

// Middleware to authenticate internal service calls
router.use(internalAuthMiddleware);

// === USER DETAIL ROUTES ===
// The specific route the rental-service will call
router.get('/users/:userId/details', internalController.getUserDetails);


// 🌟 INCREMENT SUBMISSION STATS ROUTES (CORRECTED)
router.post('/users/:userId/stats/increment-submitted', async (req, res) => {
  const { userId } = req.params;
  logger.info(`[InternalAPI] Incrementing submitted count for user: ${userId}`);
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      // CORRECTED: Use 'totalSubmissions' from your schema
      { $inc: { 'submissionStats.totalSubmissions': 1 }, 'submissionStats.lastSubmissionAt': new Date() },
      { new: true, upsert: false }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    logger.info(`[InternalAPI] Successfully incremented submitted count for user: ${userId}`);
    res.json({ success: true, message: 'Submitted count incremented', submissionStats: user.submissionStats });
  } catch (error) {
    logger.error(`[InternalAPI] Error incrementing submitted count:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/users/:userId/stats/increment-verified', async (req, res) => {
  const { userId } = req.params;
  logger.info(`[InternalAPI] Incrementing verified count for user: ${userId}`);
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      // CORRECTED: Use 'approvedSubmissions' from your schema
      { $inc: { 'submissionStats.approvedSubmissions': 1 } },
      { new: true, upsert: false }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    logger.info(`[InternalAPI] Successfully incremented verified count for user: ${userId}`);
    res.json({ success: true, message: 'Verified count incremented', submissionStats: user.submissionStats });
  } catch (error) {
    logger.error(`[InternalAPI] Error incrementing verified count:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/users/:userId/stats/increment-rejected', async (req, res) => {
  const { userId } = req.params;
  logger.info(`[InternalAPI] Incrementing rejected count for user: ${userId}`);
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      // CORRECTED: Use 'rejectedSubmissions' from your schema
      { $inc: { 'submissionStats.rejectedSubmissions': 1 } },
      { new: true, upsert: false }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.info(`[InternalAPI] Successfully incremented rejected count for user: ${userId}`);
    res.json({ success: true, message: 'Rejected count incremented', submissionStats: user.submissionStats });
  } catch (error) {
    logger.error(`[InternalAPI] Error incrementing rejected count:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 🌟 AWARD COINS ROUTE (Using the robust model method)
router.post('/users/:userId/coins/update', async (req, res) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;
  if (!amount || typeof amount !== 'number') {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Valid "amount" (number) is required' });
  }
  logger.info(`[InternalAPI] Updating coins for user: ${userId}, amount: ${amount}, reason: ${reason}`);
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'User not found' });
    
    // Use the robust method from your User model to ensure totals are also updated
    await user.updateCoins(amount, reason || 'Update from Rewards Service');
    
    logger.info(`[InternalAPI] Successfully updated coins for user: ${userId}. New balance: ${user.coins}`);
    res.json({ success: true, message: 'Coins updated successfully', newBalance: user.coins, amountAdded: amount });
  } catch (error) {
    logger.error(`[InternalAPI] Error updating coins for user ${userId}:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// GET USER DETAILS (No changes needed)
router.get('/users/:userId/details', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    logger.error(`[InternalAPI] Error fetching user details:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



router.post('/notify-redemption', async (req, res) => {
  logger.info('[Internal] Received request to create redemption notification.');
  try {
      // The body will contain { userId, userFullName, rewardName, levelId }
      await createRedemptionRequestNotification(req.body);
      res.status(200).json({ success: true, message: 'Notification created successfully.' });
  } catch (error) {
      logger.error('[Internal] Failed to create redemption notification:', error);
      res.status(500).json({ success: false, message: 'Internal server error while creating notification.' });
  }
});

router.post('/users/:userId/grant-spin', async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid user ID format.' });
  }

  try {
      const user = await User.findByIdAndUpdate(
          userId,
          { $inc: { availableSpins: 1 } },
          { new: true }
      );

      if (!user) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found.' });
      }

      logger.info(`[Internal] Granted one spin to user ${userId}. New total: ${user.availableSpins}`);
      res.status(StatusCodes.OK).json({
          success: true,
          message: 'Spin granted successfully.',
          availableSpins: user.availableSpins,
      });
  } catch (error) {
      logger.error(`[Internal] Error granting spin to user ${userId}:`, error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});


module.exports = router;