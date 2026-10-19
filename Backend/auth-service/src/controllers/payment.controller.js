// auth-service/src/controllers/payment.controller.js - ENHANCED WITH BETTER ERROR HANDLING

const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const RewardRedemption = require('../models/RewardRedemption');
const PaymentService = require('../services/payment.service');
const logger = require('../config/logger');
const mongoose = require('mongoose');

const BASE_PRICE = parseFloat(process.env.SUBSCRIPTION_PRICE || '199');

/**
 * @desc   Get subscription details, including applicable discounts
 * @route  GET /api/auth/subscription/details
 * @access Private
 */
exports.getSubscriptionDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false,
                message: 'User not found.' 
            });
        }

        if (user.subscription && user.subscription.status === 'active') {
            return res.status(StatusCodes.OK).json({
                success: true,
                isSubscribed: true,
                status: user.subscription.status,
                endDate: user.subscription.endDate,
                message: "You already have an active subscription."
            });
        }

        // Find potential discounts
        const potentialDiscounts = await RewardRedemption.find({
            userId,
            rewardName: { $regex: 'subscription', $options: 'i' },
            _id: { $nin: user.usedRewards.map(r => r.redemptionId) }
        });

        let bestDiscount = { percentage: 0, reward: null };
        if (potentialDiscounts.length > 0) {
            potentialDiscounts.forEach(reward => {
                const match = reward.rewardName.match(/(\d+)%/);
                if (match) {
                    const percentage = parseInt(match[1], 10);
                    if (percentage > bestDiscount.percentage) {
                        bestDiscount = { percentage, reward };
                    }
                }
            });
        }
        
        const discountAmount = (BASE_PRICE * bestDiscount.percentage) / 100;
        const finalPrice = Math.max(0, BASE_PRICE - discountAmount); // Ensure non-negative

        res.status(StatusCodes.OK).json({
            success: true,
            isSubscribed: false,
            basePrice: BASE_PRICE,
            discount: {
                percentage: bestDiscount.percentage,
                amount: discountAmount,
                rewardName: bestDiscount.reward ? bestDiscount.reward.rewardName : null,
                rewardId: bestDiscount.reward ? bestDiscount.reward._id : null
            },
            finalPrice: finalPrice,
        });

    } catch (error) {
        logger.error(`Error getting subscription details for user ${req.user.userId}: ${error.message}`);
        logger.error(`Stack trace: ${error.stack}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to get subscription details.' 
        });
    }
};

/**
 * @desc   Create a Razorpay order for the subscription
 * @route  POST /api/auth/subscription/create-order
 * @access Private
 */
exports.createSubscriptionOrder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { finalPrice, rewardId } = req.body;

        logger.info(`Creating subscription order for user ${userId} with finalPrice: ${finalPrice}, rewardId: ${rewardId}`);

        // Validate input
        if (finalPrice === undefined || finalPrice === null) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                message: 'Final price is required.' 
            });
        }

        if (typeof finalPrice !== 'number' || finalPrice < 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                message: 'Invalid final price. Must be a non-negative number.' 
            });
        }

        // If the price is 0, we can skip Razorpay and activate directly
        if (finalPrice === 0) {
            logger.info(`Free subscription activation for user ${userId}`);
            // Modify request body for free activation
            req.body.razorpay_order_id = 'free_activation';
            req.body.razorpay_payment_id = 'free_activation';
            req.body.razorpay_signature = 'free_activation';
            req.body.rewardId = rewardId;
            
            return exports.verifyPaymentAndActivate(req, res, { isFree: true, rewardId });
        }

        // Verify user exists and doesn't already have active subscription
        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false,
                message: 'User not found.' 
            });
        }

        if (user.subscription && user.subscription.status === 'active') {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false,
                message: 'User already has an active subscription.' 
            });
        }

        // Test Razorpay connection before creating order
        const connectionTest = await PaymentService.testRazorpayConnection();
        if (!connectionTest) {
            logger.error('Razorpay connection test failed before order creation');
            return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ 
                success: false,
                message: 'Payment service is currently unavailable. Please try again later.' 
            });
        }

        // Create the Razorpay order
        const order = await PaymentService.createRazorpayOrder(finalPrice, userId, rewardId);

        logger.info(`Razorpay order created successfully for user ${userId}: ${order.id}`);

        res.status(StatusCodes.CREATED).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            key: process.env.RAZORPAY_KEY_ID,
            user: {
                id: userId,
                email: user.email,
                name: user.personalInfo ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}` : user.email
            }
        });

    } catch (error) {
        logger.error(`Error creating Razorpay order for user ${req.user?.userId || 'unknown'}:`);
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        
        // Check if it's a specific Razorpay error
        if (error.message.includes('Razorpay credentials')) {
            return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ 
                success: false, 
                message: 'Payment service configuration error. Please contact support.' 
            });
        }
        
        if (error.message.includes('Invalid amount')) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Invalid payment amount provided.' 
            });
        }

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to create payment order. Please try again later.' 
        });
    }
};

/**
 * @desc   Verify the payment and activate the subscription
 * @route  POST /api/auth/subscription/verify-payment
 * @access Private
 */
exports.verifyPaymentAndActivate = async (req, res, options = {}) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rewardId } = req.body;
    const userId = req.user.userId;
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        logger.info(`Starting payment verification for user ${userId}, order: ${razorpay_order_id}, isFree: ${options.isFree || false}`);

        // If it's not a free activation, verify the signature
        if (!options.isFree) {
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                await session.abortTransaction();
                return res.status(StatusCodes.BAD_REQUEST).json({ 
                    success: false, 
                    message: 'Missing payment verification parameters.' 
                });
            }

            const isSignatureValid = PaymentService.verifyRazorpaySignature(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            );

            if (!isSignatureValid) {
                await session.abortTransaction();
                logger.warn(`Invalid payment signature for user ${userId}, order: ${razorpay_order_id}`);
                return res.status(StatusCodes.BAD_REQUEST).json({ 
                    success: false, 
                    message: 'Invalid payment signature. Transaction verification failed.' 
                });
            }
        }
        
        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        // Check if user already has active subscription
        if (user.subscription && user.subscription.status === 'active') {
            await session.abortTransaction();
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'User already has an active subscription.' 
            });
        }

        const duration = parseInt(process.env.SUBSCRIPTION_DURATION_DAYS || '365');
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

        user.subscription = {
            status: 'active',
            plan: 'annual',
            startDate: startDate,
            endDate: endDate,
            razorpayOrderId: razorpay_order_id || 'free_activation',
            razorpayPaymentId: razorpay_payment_id || 'free_activation',
            razorpaySignature: razorpay_signature || 'free_activation',
        };
        
        user.subscriptionStatus = 'active';

        // Handle reward redemption
        const finalRewardId = options.isFree ? options.rewardId : rewardId;
        if (finalRewardId) {
            const reward = await RewardRedemption.findById(finalRewardId).session(session);
            if (reward) {
                user.usedRewards.push({
                    redemptionId: reward._id,
                    rewardName: reward.rewardName,
                    usedAt: new Date(),
                });
                logger.info(`Marked reward ${finalRewardId} as used for user ${userId}`);
            } else {
                logger.warn(`Could not find reward with ID ${finalRewardId} to mark as used for user ${userId}`);
            }
        }

        await user.save({ session });
        await session.commitTransaction();

        logger.info(`Subscription activated successfully for user: ${userId}`);
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Subscription activated successfully!',
            subscription: {
                status: user.subscription.status,
                plan: user.subscription.plan,
                startDate: user.subscription.startDate,
                endDate: user.subscription.endDate
            }
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error verifying payment for user ${userId}:`);
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to verify payment and activate subscription.' 
        });
    } finally {
        session.endSession();
    }
};