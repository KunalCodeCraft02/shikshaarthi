// ========================================================================
// FILE: auth-service/src/services/payment.service.js (FULL & CORRECTED)
// ========================================================================

const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../config/logger');

let instance;

/**
 * Initializes the Razorpay instance.
 * This function is called once when the module is loaded.
 * It validates that the necessary environment variables are present.
 * @throws {Error} If Razorpay credentials are missing or invalid.
 */
const initializeRazorpay = () => {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        logger.info(`Initializing Razorpay with Key ID: ${keyId ? keyId.substring(0, 8) + '...' : 'MISSING'}`);
        logger.info(`Razorpay Key Secret: ${keySecret ? 'SET' : 'MISSING'}`);
        
        if (!keyId || !keySecret) {
            throw new Error('Razorpay credentials missing. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.');
        }

        if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
            logger.warn('Razorpay Key ID has an unusual format. Ensure it is correct.');
        }

        instance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
        
        logger.info('Razorpay instance created successfully');
    } catch (error) {
        logger.error(`FATAL: Failed to initialize Razorpay: ${error.message}`);
        // In a production environment, you might want to exit the process
        // process.exit(1);
        throw error;
    }
};

// Initialize on module load
initializeRazorpay();

/**
 * Creates a new order with Razorpay.
 * @param {number} amount - The final amount to be charged (e.g., 199.00).
 * @param {string} userId - The MongoDB ObjectId of the user making the payment.
 * @param {string|null} rewardId - The ID of any reward being used, or null.
 * @returns {Promise<object>} The Razorpay order object.
 * @throws {Error} If order creation fails.
 */
const createRazorpayOrder = async (amount, userId, rewardId) => {
    try {
        if (typeof amount !== 'number' || amount <= 0) {
            throw new Error(`Invalid amount provided: ${amount}. Amount must be a positive number.`);
        }

        // Razorpay expects amount in the smallest currency unit (e.g., paise for INR).
        const amountInPaise = Math.round(amount * 100);

        // --- THIS IS THE FIX ---
        // Generate a shorter, but still very unique, receipt ID to stay under the 40-character limit.
        // Format: rcpt_ + last 8 chars of user ID + _ + timestamp
        // Example Length: 4 + 1 + 8 + 1 + 13 = 27 characters.
        const shortReceiptId = `rcpt_${userId.toString().slice(-8)}_${Date.now()}`;

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: shortReceiptId,
            notes: {
                userId: userId.toString(),
                rewardId: rewardId ? rewardId.toString() : "none",
                service: "subscription"
            }
        };

        logger.info(`Creating Razorpay order for user ${userId} with amount ₹${amount} (${amountInPaise} paise)`);
        logger.debug('Razorpay order options:', options);

        const order = await instance.orders.create(options);
        
        if (!order || !order.id) {
            throw new Error('Razorpay order creation returned a malformed response.');
        }

        logger.info(`Razorpay order created successfully for user ${userId}: ${order.id}`);
        return order;

    } catch (error) {
        logger.error(`Error in createRazorpayOrder for user ${userId}:`);
        
        // Log specific Razorpay API error details if available
        if (error.statusCode) {
            logger.error(`Razorpay API Error - Status: ${error.statusCode}, Code: ${error.error?.code}, Description: ${error.error?.description}`);
        } else {
            logger.error(`Error message: ${error.message || 'Unknown error'}`);
        }
        
        // Re-throw with a clean, user-facing message for the controller to use
        const specificError = error.error?.description || error.message || 'An unknown error occurred during order creation.';
        throw new Error(`Could not create Razorpay order: ${specificError}`);
    }
};

/**
 * Verifies the signature received from Razorpay after a successful payment.
 * @param {string} orderId - The Razorpay order ID.
 * @param {string} paymentId - The Razorpay payment ID.
 * @param {string} signature - The signature sent by Razorpay.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        
        if (!keySecret) {
            throw new Error('Razorpay key secret is not configured for signature verification.');
        }

        if (!orderId || !paymentId || !signature) {
            throw new Error('Missing required parameters for signature verification.');
        }

        const body = orderId + "|" + paymentId;

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body.toString())
            .digest('hex');

        const isValid = expectedSignature === signature;
        
        if (isValid) {
            logger.info(`Razorpay signature VERIFIED for order: ${orderId}`);
        } else {
            logger.warn(`Razorpay signature FAILED for order: ${orderId}`);
            logger.debug(`Expected Signature: ${expectedSignature}, Received Signature: ${signature}`);
        }
        
        return isValid;
    } catch (error) {
        logger.error(`Critical error in verifyRazorpaySignature: ${error.message}`);
        return false;
    }
};

/**
 * Tests the connection to Razorpay by creating a minimal order.
 * @returns {Promise<boolean>} True if the connection is successful, false otherwise.
 */
const testRazorpayConnection = async () => {
    try {
        const testOptions = {
            amount: 100, // ₹1 in paise
            currency: "INR",
            receipt: `test_receipt_${Date.now()}`,
        };

        const testOrder = await instance.orders.create(testOptions);
        logger.info(`Razorpay connection test successful. Test order ID: ${testOrder.id}`);
        return true;
    } catch (error) {
        logger.error(`Razorpay connection test FAILED: ${error.message}`);
        if (error.statusCode === 401) {
            logger.error("This is an authentication error. Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
        }
        return false;
    }
};

module.exports = {
    createRazorpayOrder,
    verifyRazorpaySignature,
    testRazorpayConnection,
};