// ========================================================================
// FILE: rewards-service/src/controllers/admin.controller.js (CORRECTED)
// ========================================================================

const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const CentralSubmissionModule = require('../models/CentralSubmission.model');
const CoinTransactionModule = require('../models/CoinTransaction.model');
const { getServiceModel } = require('../utils/service-model.util');
const coinCalculatorService = require('../services/coin-calculator.service');
const authApiService = require('../services/auth-api.service');
const notificationService = require('../services/notification.service');
const logger = require('../config/logger');
const { getDbConnection } = require('../config/db');

// ==========================================================
// FIX: Add the missing imports for 'config' and 'axios'
// ==========================================================
const config = require('../config');
const axios = require('axios');


// ==========================================================
// FIX #1: Import the AdminNotification model module
// ==========================================================
const AdminNotificationModule = require('../models/AdminNotification.model');

const getAdminSubmissions = async (req, res) => {
  const reqIdForLog = req.user?.id ? `admin-${req.user.id.slice(-4)}-getsubs-${Date.now().toString().slice(-5)}` : `get-admin-submissions-${Date.now()}`;
  logger.info(`[${reqIdForLog}] Admin submission fetch request received.`, { query: req.query });

  const { status = 'all', page = 1, limit = 10, serviceType } = req.query; // Default to 'all' for clarity
  const CentralSubmission = CentralSubmissionModule.getModel();

  if (!CentralSubmission) {
    logger.error(`[${reqIdForLog}] CRITICAL: CentralSubmission model is not available.`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Service temporarily unavailable." });
  }

  try {
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (serviceType) {
      query.serviceType = serviceType;
    }

    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sort: { createdAt: -1 },
    };
    const skip = (options.page - 1) * options.limit;

    const submissions = await CentralSubmission.find(query)
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit)
        .lean();
    
    const totalDocs = await CentralSubmission.countDocuments(query);
    
    logger.info(`[${reqIdForLog}] Successfully fetched ${submissions.length} of ${totalDocs} submissions.`);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Admin submissions fetched successfully.',
      data: submissions,
      pagination: {
        totalDocs,
        limit: options.limit,
        page: options.page,
        totalPages: Math.ceil(totalDocs / options.limit),
      }
    });
  } catch (error) {
    logger.error(`[${reqIdForLog}] Error fetching admin submissions:`, error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch admin submissions.' });
  }
};

const getSubmissionDetails = async (req, res) => {
    const { submissionId } = req.params;
    const adminUserId = req.user.userId;
    const reqIdForLog = `admin-${adminUserId.slice(-4)}-details-${submissionId.slice(-5)}`;
    
    logger.info(`[${reqIdForLog}] Admin fetching details for submission ${submissionId}`);
  
    const CentralSubmission = CentralSubmissionModule.getModel();
    if (!CentralSubmission) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Service unavailable." });
    }
  
    try {
      const submission = await CentralSubmission.findById(submissionId).lean();
      if (!submission) {
        return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Submission not found.' });
      }
  
      const ServiceModel = getServiceModel(submission.serviceType);
      if (!ServiceModel) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: `Internal error: Service model for '${submission.serviceType}' not found.` });
      }
  
      const serviceSpecificData = await ServiceModel.findById(submission.serviceDataId).lean();
      if (!serviceSpecificData) {
        return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Service-specific data is missing for this submission.' });
      }
  
      const detailedSubmission = { ...submission, serviceSpecificData };
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Submission details fetched successfully.',
        data: detailedSubmission
      });
  
    } catch (error) {
      logger.error(`[${reqIdForLog}] Error fetching submission details for ${submissionId}:`, error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch submission details.' });
    }
};

const updateSubmissionData = async (req, res) => {
    const { submissionId } = req.params;
    const updatedData = req.body;
    const adminUserId = req.user.userId;
    const reqIdForLog = `admin-${adminUserId.slice(-4)}-update-${submissionId.slice(-5)}`;

    logger.info(`[${reqIdForLog}] Attempting to update data for submission ${submissionId}`);

    const CentralSubmission = CentralSubmissionModule.getModel();
    if (!CentralSubmission) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Service unavailable." });

    try {
        const submission = await CentralSubmission.findById(submissionId);
        if (!submission) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Submission not found." });
        }
        if (submission.status !== 'pending') {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Cannot edit a submission that has already been processed." });
        }

        const ServiceModel = getServiceModel(submission.serviceType);
        if (!ServiceModel) {
            throw new Error(`Service model for ${submission.serviceType} not found.`);
        }

        // Sanitize update data
        delete updatedData._id;
        delete updatedData.userId;
        delete updatedData.centralSubmissionId;
        delete updatedData.createdAt;
        delete updatedData.updatedAt;

        const updatedServiceData = await ServiceModel.findByIdAndUpdate(
            submission.serviceDataId,
            { $set: updatedData },
            { new: true, runValidators: true }
        ).lean();
        
        if(!updatedServiceData) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Service-specific data record not found." });
        }
        
        submission.titlePreview = updatedServiceData.name || updatedServiceData.title || submission.titlePreview;
        submission.locationPreview = `${updatedServiceData.district || 'N/A'}, ${updatedServiceData.state || 'N/A'}`.replace(/^, |, $/g, '');
        await submission.save();

        logger.info(`[${reqIdForLog}] Successfully updated data for submission ${submissionId}.`);
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Submission data updated successfully.",
            data: updatedServiceData,
        });

    } catch (error) {
        logger.error(`[${reqIdForLog}] Error updating submission data for ${submissionId}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Validation Error: ${error.message}`});
        }
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to update submission data." });
    }
};

// const approveSubmission = async (req, res) => {
//   const { submissionId } = req.params;
//   const { adminNotes } = req.body;
//   const adminUserId = req.user.userId;
//   const reqIdForLog = `admin-${adminUserId.slice(-4)}-approve-${submissionId.slice(-5)}`;

//   logger.info(`[${reqIdForLog}] Starting approval process for submission ${submissionId}`, { adminId: adminUserId, notes: adminNotes });

//   const rewardsDb = getDbConnection('rewards');
//   if (!rewardsDb) {
//       logger.error(`[${reqIdForLog}] CRITICAL: Could not get rewards DB connection.`);
//       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Database service is not ready.' });
//   }

//   const session = await rewardsDb.startSession();

//   try {
//       session.startTransaction();
//       logger.info(`[${reqIdForLog}] Database transaction started successfully.`);

//       const CentralSubmission = CentralSubmissionModule.getModel();
//       const CoinTransaction = CoinTransactionModule.getModel();

//       const submission = await CentralSubmission.findById(submissionId).session(session);
//       if (!submission) {
//           await session.abortTransaction();
//           return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Submission not found.' });
//       }
//       logger.info(`[${reqIdForLog}] Found submission, status: ${submission.status}.`);

//       if (submission.status !== 'pending') {
//           await session.abortTransaction();
//           return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Submission already processed. Status: ${submission.status}` });
//       }

//       // 1. Prepare DB changes in memory
//       submission.status = 'verified';
//       submission.verifiedBy = adminUserId;
//       submission.verifiedAt = new Date();
//       submission.adminNotes = adminNotes;
    
//       const coinsToAward = coinCalculatorService.calculateCoinsForSubmission(submission.serviceType);
//       let coinTx; // Will hold the coin transaction document if created
    
//       // 2. Prepare all calls to the auth-service
//       const apiPromises = [];

//       // 2a. Award coins for the submission
//       if (coinsToAward > 0) {
//           logger.info(`[${reqIdForLog}] Preparing coin transaction for ${coinsToAward} coins.`);
//           coinTx = new CoinTransaction({ // Create object, but DO NOT save yet
//               userId: submission.userId,
//               userEmail: submission.userEmail,
//               type: 'submission_reward',
//               amount: coinsToAward,
//               description: `Reward for verified ${submission.serviceType} submission.`,
//               relatedSubmissionId: submission._id,
//               serviceType: submission.serviceType,
//           });
//           apiPromises.push(authApiService.awardCoins(submission.userId, coinsToAward, `Reward for ${submission.serviceType}`));
//       }
      
//       // 2b. Grant a spin for the approved submission
//       logger.info(`[${reqIdForLog}] Preparing to grant 1 spin to user ${submission.userId}.`);
//       apiPromises.push(authApiService.grantSpin(submission.userId));
      
//       // 2c. Increment the user's 'verified' stats
//       apiPromises.push(authApiService.incrementSubmissionStats(submission.userId, 'verified'));

//       // 3. Execute all external API calls *before* writing to the database
//       logger.info(`[${reqIdForLog}] Executing ${apiPromises.length} API calls to auth-service.`);
//       await Promise.all(apiPromises);
//       logger.info(`[${reqIdForLog}] All API calls to auth-service successful.`);

//       // 4. Now that external calls succeeded, save all DB changes and commit the transaction
//       if (coinTx) {
//           await coinTx.save({ session });
//       }
//       await submission.save({ session });
      
//       await session.commitTransaction();
//       logger.info(`[${reqIdForLog}] Transaction committed successfully.`);
    
//       // 5. Send a notification to the user (fire-and-forget)
//       const userMessage = `Your submission "${submission.titlePreview || ''}" has been approved! You earned ${coinsToAward} Supercoins and 1 Spin Wheel chance!`;
//       notificationService.createUserStatusUpdateNotification(submission, userMessage);

//       // 6. Return the final success response
//       return res.status(StatusCodes.OK).json({ 
//           success: true, 
//           message: 'Submission approved, coins awarded, and spin granted successfully.', 
//           data: submission 
//       });

//   } catch (error) {
//       logger.error(`[${reqIdForLog}] CRITICAL ERROR during approval:`, { message: error.message, stack: error.stack });
//       if (session.inTransaction()) {
//           await session.abortTransaction();
//           logger.warn(`[${reqIdForLog}] Transaction aborted due to error.`);
//       }
//       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to approve submission due to an internal error.' });
//   } finally {
//       await session.endSession();
//       logger.info(`[${reqIdForLog}] Session ended.`);
//   }
// };


// const approveSubmission = async (req, res) => {
//   const { submissionId } = req.params;
//   const { adminNotes } = req.body;
//   const adminUserId = req.user.userId;
//   const reqIdForLog = `admin-${adminUserId.slice(-4)}-approve-${submissionId.slice(-5)}`;

//   logger.info(`[${reqIdForLog}] Starting approval process for submission ${submissionId}`);
//   const rewardsDb = getDbConnection('rewards');
//   if (!rewardsDb) {
//       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Database service is not ready.' });
//   }

//   const session = await rewardsDb.startSession();

//   try {
//       session.startTransaction();
//       const CentralSubmission = CentralSubmissionModule.getModel();
//       const submission = await CentralSubmission.findById(submissionId).session(session);

//       if (!submission) {
//           throw new Error('Submission not found.');
//       }
//       if (submission.status !== 'pending') {
//           throw new Error(`Submission already processed. Status: ${submission.status}`);
//       }

//       // ========================= START: THE CRITICAL FIX =========================
//       const SourceServiceModel = getServiceModel(submission.serviceType);
//       const sourceData = await SourceServiceModel.findById(submission.serviceDataId).lean().session(session);
//       if (!sourceData) {
//           throw new Error(`Inconsistency: Source data for submission ${submissionId} not found.`);
//       }

//       const LiveServiceModel = getLiveServiceModel(submission.serviceType);
//       if (!LiveServiceModel) {
//           throw new Error(`Live service model for ${submission.serviceType} could not be loaded.`);
//       }

//       const liveDataPayload = { ...sourceData, status: 'available' };
//       delete liveDataPayload._id;
//       delete liveDataPayload.centralSubmissionId;
//       delete liveDataPayload.__v;
//       delete liveDataPayload.createdAt;
//       delete liveDataPayload.updatedAt;

//       const liveDocument = new LiveServiceModel(liveDataPayload);
//       // Note: We save this OUTSIDE the rewards-service transaction, as it's a different DB.
//       await liveDocument.save();
//       logger.info(`[${reqIdForLog}] Saved live document to ${submission.serviceType}-service DB. New ID: ${liveDocument._id}`);
//       // ========================== END: THE CRITICAL FIX ==========================

//       submission.status = 'verified';
//       submission.verifiedBy = adminUserId;
//       submission.verifiedAt = new Date();
//       submission.adminNotes = adminNotes;

//       const coinsToAward = coinCalculatorService.calculateCoinsForSubmission(submission.serviceType);
//       const apiPromises = [];
//       if (coinsToAward > 0) {
//           apiPromises.push(authApiService.awardCoins(submission.userId, coinsToAward, `Reward for ${submission.serviceType}`));
//       }
//       apiPromises.push(authApiService.grantSpin(submission.userId));
//       apiPromises.push(authApiService.incrementSubmissionStats(submission.userId, 'verified'));

//       await Promise.all(apiPromises);
//       await submission.save({ session });
//       await session.commitTransaction();

//       const userMessage = `Your submission "${submission.titlePreview || ''}" has been approved! You earned ${coinsToAward} Supercoins and 1 Spin Wheel chance!`;
//       notificationService.createUserStatusUpdateNotification(submission, userMessage);

//       return res.status(StatusCodes.OK).json({ 
//           success: true, 
//           message: 'Submission approved and published successfully.', 
//           data: submission 
//       });

//   } catch (error) {
//       logger.error(`[${reqIdForLog}] CRITICAL ERROR during approval:`, { message: error.message, stack: error.stack });
//       if (session.inTransaction()) {
//           await session.abortTransaction();
//       }
//       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Failed to approve submission.' });
//   } finally {
//       await session.endSession();
//   }
// };


// ======================================================================================
// PASTE THIS ENTIRE FUNCTION INTO rewards-service/src/controllers/admin.controller.js
// It replaces your old approveSubmission function.
// ======================================================================================

// const approveSubmission = async (req, res) => {
//     const { submissionId } = req.params;
//     const { adminNotes } = req.body;
//     const adminUserId = req.user.userId;
//     const reqIdForLog = `admin-${adminUserId.slice(-4)}-approve-${submissionId.slice(-5)}`;

//     logger.info(`[${reqIdForLog}] Starting approval process for submission ${submissionId}`);

//     // Get the database connection for the 'rewards' service where the transaction will live
//     const rewardsDb = getDbConnection('rewards');
//     if (!rewardsDb) {
//         logger.error(`[${reqIdForLog}] CRITICAL: Could not get rewards DB connection.`);
//         return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Database service is not ready.' });
//     }

//     const session = await rewardsDb.startSession();
//     let centralSubmission; // To hold submission data across scopes

//     try {
//         // === Step 1: Fetch all necessary data *before* starting the transaction ===
//         const CentralSubmission = CentralSubmissionModule.getModel();

//         // Fetch the main submission document to get its type and check its status
//         const submissionToApprove = await CentralSubmission.findById(submissionId).lean();

//         if (!submissionToApprove) {
//             throw new Error('Submission not found.');
//         }
//         if (submissionToApprove.status !== 'pending') {
//             throw new Error(`Submission has already been processed. Current status: ${submissionToApprove.status}`);
//         }

//         // Fetch the detailed data from the service-specific DB (e.g., 'mess' or 'rental')
//         // NO session is used here because it's a different database connection.
//         const SourceServiceModel = getServiceModel(submissionToApprove.serviceType);
//         const sourceData = await SourceServiceModel.findById(submissionToApprove.serviceDataId).lean();

//         if (!sourceData) {
//             throw new Error(`Inconsistency: Source data for submission ${submissionId} not found in the ${submissionToApprove.serviceType} collection.`);
//         }
        
//         // === Step 2: Start the transaction on the Rewards DB ===
//         session.startTransaction();
//         logger.info(`[${reqIdForLog}] Database transaction started on 'rewards' database.`);

//         // Re-fetch inside the transaction to apply a lock
//         centralSubmission = await CentralSubmission.findById(submissionId).session(session);

//         // Update the central submission document
//         centralSubmission.status = 'verified';
//         centralSubmission.verifiedBy = adminUserId;
//         centralSubmission.verifiedAt = new Date();
//         centralSubmission.adminNotes = adminNotes;
//         await centralSubmission.save({ session });
//         logger.info(`[${reqIdForLog}] CentralSubmission status updated to 'verified' within the transaction.`);

//         // === Step 3: Commit the Rewards DB Transaction FIRST ===
//         await session.commitTransaction();
//         logger.info(`[${reqIdForLog}] Transaction committed successfully on 'rewards' database.`);


//         // === Step 4: Perform operations on OTHER databases (Post-Transaction) ===
//         // This is "eventual consistency." We publish the live data *after* confirming the approval.
//         try {
//             // This function needs to exist and return the model for your LIVE data collection
//             const LiveServiceModel = getLiveServiceModel(centralSubmission.serviceType);
//             if (!LiveServiceModel) {
//                 throw new Error(`CRITICAL: Live service model for '${centralSubmission.serviceType}' could not be loaded.`);
//             }

//             const liveDataPayload = { ...sourceData, status: 'available' };
//             delete liveDataPayload._id;
//             delete liveDataPayload.centralSubmissionId;
//             delete liveDataPayload.__v;
//             delete liveDataPayload.createdAt;
//             delete liveDataPayload.updatedAt;

//             const liveDocument = new LiveServiceModel(liveDataPayload);
//             await liveDocument.save(); // This is a single operation on a different DB.
//             logger.info(`[${reqIdForLog}] Saved live document to ${centralSubmission.serviceType}-service DB. New ID: ${liveDocument._id}`);
//         } catch (liveDbError) {
//             // IMPORTANT: If this fails, the submission is approved but the data is not public.
//             // This requires manual intervention, so we log it as a critical failure.
//             logger.error(`[${reqIdForLog}] CRITICAL FAILURE: Transaction was committed, but failed to publish live data for submission ${submissionId}. MANUAL INTERVENTION REQUIRED.`, { error: liveDbError });
//             // Let the process continue, as the core task (approval) is done.
//         }

//         // === Step 5: Perform non-critical side effects (API calls, notifications) ===
//         const coinsToAward = coinCalculatorService.calculateCoinsForSubmission(centralSubmission.serviceType);
//         const apiPromises = [];
//         if (coinsToAward > 0) {
//             apiPromises.push(authApiService.awardCoins(centralSubmission.userId, coinsToAward, `Reward for ${centralSubmission.serviceType}`));
//         }
//         apiPromises.push(authApiService.grantSpin(centralSubmission.userId));
//         apiPromises.push(authApiService.incrementSubmissionStats(centralSubmission.userId, 'verified'));

//         // We don't wait for these. If they fail, it doesn't change the approval status.
//         Promise.all(apiPromises).catch(err => {
//             logger.error(`[${reqIdForLog}] Post-approval API calls failed for submission ${submissionId}. This does not affect approval status but needs checking.`, { error: err });
//         });
        
//         const userMessage = `Your submission "${centralSubmission.titlePreview || ''}" has been approved! You earned ${coinsToAward} Supercoins and 1 Spin Wheel chance!`;
//         notificationService.createUserStatusUpdateNotification(centralSubmission, userMessage);

//         // === Step 6: Final Success Response ===
//         return res.status(StatusCodes.OK).json({
//             success: true,
//             message: 'Submission approved and published successfully.',
//             data: centralSubmission
//         });

//     } catch (error) {
//         logger.error(`[${reqIdForLog}] CRITICAL ERROR during approval process:`, { message: error.message, stack: error.stack });
//         if (session.inTransaction()) {
//             await session.abortTransaction();
//             logger.warn(`[${reqIdForLog}] Transaction aborted due to error.`);
//         }
//         return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Failed to approve submission.' });
//     } finally {
//         await session.endSession();
//         logger.info(`[${reqIdForLog}] Session ended.`);
//     }
// };


// In: backend/rewards-service/src/controllers/admin.controller.js

const approveSubmission = async (req, res) => {
    const { submissionId } = req.params;
    const { adminNotes } = req.body;
    const adminUserId = req.user.userId;
    const reqIdForLog = `admin-${adminUserId.slice(-4)}-approve-${submissionId.slice(-5)}`;

    logger.info(`[${reqIdForLog}] Starting approval process for submission ${submissionId}`);

    const rewardsDb = getDbConnection('rewards');
    if (!rewardsDb) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Database service is not ready.' });
    }

    const session = await rewardsDb.startSession();
    let centralSubmission; 

    try {
        // === Step 1: Fetch all necessary data *before* starting the transaction ===
        const CentralSubmission = CentralSubmissionModule.getModel();
        const submissionToApprove = await CentralSubmission.findById(submissionId).lean();

        if (!submissionToApprove) {
            throw new Error('Submission not found.');
        }
        if (submissionToApprove.status !== 'pending') {
            throw new Error(`Submission has already been processed. Current status: ${submissionToApprove.status}`);
        }
        
        // === Step 2: Start the transaction on the Rewards DB ===
        session.startTransaction();
        logger.info(`[${reqIdForLog}] Database transaction started on 'rewards' database.`);

        centralSubmission = await CentralSubmission.findById(submissionId).session(session);

        centralSubmission.status = 'verified';
        centralSubmission.verifiedBy = adminUserId;
        centralSubmission.verifiedAt = new Date();
        centralSubmission.adminNotes = adminNotes;
        await centralSubmission.save({ session });
        logger.info(`[${reqIdForLog}] CentralSubmission status updated to 'verified' within the transaction.`);

        // === Step 3: Commit the Rewards DB Transaction FIRST ===
        await session.commitTransaction();
        logger.info(`[${reqIdForLog}] Transaction committed successfully on 'rewards' database.`);


        // === Step 4: Perform operations on OTHER databases (Post-Transaction) ===
        // This is where we will add the logic to update the service-specific data.
        try {
            // Get the model for the specific service (e.g., PlumberData)
            const ServiceModel = getServiceModel(centralSubmission.serviceType);
            if (!ServiceModel) {
                // This is a critical error if the model can't be found
                throw new Error(`CRITICAL: Service model for '${centralSubmission.serviceType}' could not be loaded.`);
            }

            // =======================================================================
            // THE FIX: Update the verificationStatus in the service-specific collection.
            // =======================================================================
            const updatedServiceDoc = await ServiceModel.findByIdAndUpdate(
                centralSubmission.serviceDataId,
                { $set: { verificationStatus: 'verified' } },
                { new: true } // Return the updated document
            );

            if (!updatedServiceDoc) {
                logger.error(`[${reqIdForLog}] FAILED to find and update service data doc with ID: ${centralSubmission.serviceDataId} in collection for ${centralSubmission.serviceType}`);
            } else {
                logger.info(`[${reqIdForLog}] Successfully updated verificationStatus to 'verified' for doc ${updatedServiceDoc._id} in ${centralSubmission.serviceType} collection.`);
            }
            // ========================== END OF FIX ============================

        } catch (serviceDbError) {
            // If this fails, the submission is approved but the status isn't updated.
            // This requires logging for manual intervention.
            logger.error(`[${reqIdForLog}] CRITICAL FAILURE: Transaction was committed, but failed to update the service-specific data for submission ${submissionId}. MANUAL INTERVENTION REQUIRED.`, { error: serviceDbError });
        }

        // === Step 5: Perform non-critical side effects (API calls, notifications) ===
        const coinsToAward = coinCalculatorService.calculateCoinsForSubmission(centralSubmission.serviceType);
        const apiPromises = [];
        if (coinsToAward > 0) {
            apiPromises.push(authApiService.awardCoins(centralSubmission.userId, coinsToAward, `Reward for ${centralSubmission.serviceType}`));
        }
        apiPromises.push(authApiService.grantSpin(centralSubmission.userId));
        apiPromises.push(authApiService.incrementSubmissionStats(centralSubmission.userId, 'verified'));

        Promise.all(apiPromises).catch(err => {
            logger.error(`[${reqIdForLog}] Post-approval API calls failed for submission ${submissionId}. This does not affect approval status but needs checking.`, { error: err });
        });
        
        const userMessage = `Your submission "${centralSubmission.titlePreview || ''}" has been approved! You earned ${coinsToAward} Supercoins and 1 Spin Wheel chance!`;
        notificationService.createUserStatusUpdateNotification(centralSubmission, userMessage);

        // === Step 6: Final Success Response ===
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Submission approved and data status updated successfully.',
            data: centralSubmission
        });

    } catch (error) {
        logger.error(`[${reqIdForLog}] CRITICAL ERROR during approval process:`, { message: error.message, stack: error.stack });
        if (session.inTransaction()) {
            await session.abortTransaction();
            logger.warn(`[${reqIdForLog}] Transaction aborted due to error.`);
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Failed to approve submission.' });
    } finally {
        await session.endSession();
        logger.info(`[${reqIdForLog}] Session ended.`);
    }
};

const rejectSubmission = async (req, res) => {
    const { submissionId } = req.params;
    const { adminNotes } = req.body;
    const adminUserId = req.user.userId;
    const reqIdForLog = `admin-${adminUserId.slice(-4)}-reject-${submissionId.slice(-5)}`;

    logger.info(`[${reqIdForLog}] Starting rejection process for submission ${submissionId}`, { adminId: adminUserId, reason: adminNotes });

    const rewardsDb = getDbConnection('rewards');
    if (!rewardsDb) {
        logger.error(`[${reqIdForLog}] CRITICAL: Could not get rewards DB connection.`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Database service is not ready.' });
    }

    const session = await rewardsDb.startSession();

    try {
        const CentralSubmission = CentralSubmissionModule.getModel();
        session.startTransaction();
        logger.info(`[${reqIdForLog}] Database transaction started successfully.`);

        const submission = await CentralSubmission.findById(submissionId).session(session);
        if (!submission) {
            await session.abortTransaction();
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Submission not found.' });
        }
        logger.info(`[${reqIdForLog}] Found submission, status: ${submission.status}.`);

        if (submission.status !== 'pending') {
            await session.abortTransaction();
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Submission already processed. Status: ${submission.status}` });
        }

        // Prepare DB changes in memory
        submission.status = 'rejected';
        submission.rejectedAt = new Date();
        submission.verifiedBy = adminUserId;
        submission.rejectionReason = adminNotes;
        submission.adminNotes = adminNotes;

        // Perform external API call before DB writes
        logger.info(`[${reqIdForLog}] Calling auth-service to increment stats ('rejected')...`);
        await authApiService.incrementSubmissionStats(submission.userId, 'rejected');
        logger.info(`[${reqIdForLog}] API call to auth-service successful.`);

        // Now save to DB and commit
        await submission.save({ session });
        await session.commitTransaction();
        logger.info(`[${reqIdForLog}] Transaction committed.`);

        const userMessage = `Your submission "${submission.titlePreview || ''}" was rejected. Reason: ${adminNotes}`;
        await notificationService.createUserStatusUpdateNotification(submission, userMessage);

        return res.status(StatusCodes.OK).json({ success: true, message: 'Submission rejected successfully.', data: submission });

    } catch (error) {
        logger.error(`[${reqIdForLog}] CRITICAL ERROR during rejection:`, { message: error.message, stack: error.stack });
        if (session.inTransaction()) {
            await session.abortTransaction();
            logger.warn(`[${reqIdForLog}] Transaction aborted due to error.`);
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to reject submission.' });
    } finally {
        await session.endSession();
        logger.info(`[${reqIdForLog}] Session ended.`);
    }
};

// --- RENTAL INTEREST FUNCTIONS ---
const getRentalInterestNotifications = async (req, res) => {
    try {
        const AdminNotification = AdminNotificationModule.getModel();
        if (!AdminNotification) throw new Error("AdminNotification model is not available.");
  
        const notifications = await AdminNotification.find({ type: 'rental_interest' }).sort({ createdAt: -1 }).lean();
        res.status(StatusCodes.OK).json({ success: true, data: notifications });
    } catch (error) {
        logger.error('Failed to get rental interest notifications', { error: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server Error' });
    }
  };
  
const getRentalInterestDetails = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const AdminNotification = AdminNotificationModule.getModel();
        if (!AdminNotification) throw new Error("AdminNotification model is not available.");
  
        const notification = await AdminNotification.findById(notificationId).lean();
        if (!notification || notification.type !== 'rental_interest') {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Rental interest notification not found.' });
        }
        
        AdminNotification.updateOne({ _id: notificationId }, { $set: { isRead: true } }).catch(err => logger.warn(`Failed to mark notification ${notificationId} as read`, err));
  
        const { userId, rentalId } = notification.metadata;
        if (!userId || !rentalId) {
            logger.error('Notification metadata is incomplete for notifId:', notificationId);
            throw new Error('Notification metadata is incomplete.');
        }
        
        if (!config.RENTAL_SERVICE_URL || !config.AUTH_SERVICE_URL) {
            throw new Error('Required service URLs are not configured.');
        }
  
        const headers = { 
          'Authorization': req.header('Authorization'),
          'x-user-id': req.user.userId,
          'x-internal-api-key': config.INTERNAL_API_KEY
        };
        
        // =================================================================================
        // THE FIX: Use the internal route to get user details, not the admin route.
        // =================================================================================
        const userDetailsUrl = `${config.AUTH_SERVICE_URL}/internal/users/${userId}/details`;
        const rentalDetailsUrl = `${config.RENTAL_SERVICE_URL}/api/rentals/${rentalId}`;

        const [userResponse, rentalResponse] = await Promise.all([
            axios.get(userDetailsUrl, { headers }),
            axios.get(rentalDetailsUrl, { headers })
        ]);
  
        if (!userResponse.data.success || !rentalResponse.data.success) {
            logger.error('Failed to fetch dependent data.', { user: userResponse.data, rental: rentalResponse.data });
            throw new Error('Failed to fetch dependent user or rental data.');
        }
        
        // The internal route nests the user object under a 'user' key
        const user = userResponse.data.user; 
        const rental = rentalResponse.data.data;

        // You requested simpler details, so let's build that object.
        const simplifiedUserDetails = {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNumber: user.mobileNumber, // Assuming this field exists
            createdAt: user.createdAt
        };

        res.status(StatusCodes.OK).json({
            success: true,
            data: { 
                notification, 
                user: simplifiedUserDetails, // Sending the simplified object
                rental: rental 
            }
        });
    } catch (error) {
        logger.error('Failed to get rental interest details', { 
            error: error.response?.data || error.message,
            stack: error.stack,
        });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch complete details.' });
    }
};

  
module.exports = {
      getAdminSubmissions,
      getSubmissionDetails,
      updateSubmissionData,
      approveSubmission,
      rejectSubmission,
      getRentalInterestNotifications,
      getRentalInterestDetails
};