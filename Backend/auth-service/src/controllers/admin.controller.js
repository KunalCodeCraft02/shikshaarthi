
//auth-service/src/controllers/admin.controller.js
const Admin = require('../models/Admin');
const User = require('../models/User');
const TokenService = require('../services/token.service');
const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');
const config = require('../config');
const mongoose = require('mongoose');
const emailService = require('../services/email.service');

/**
 * @desc   Login for an administrator
 * @route  POST /api/admin/login
 * @access Public
 */
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Email and password are required." });
  }

  try {
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Invalid credentials." });
    }

    const tokenPayload = { userId: admin._id.toString(), email: admin.email, role: 'admin' };
    const tokens = TokenService.generateTokenPair(tokenPayload);

    logger.info(`Admin login successful: ${admin.email}`);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Admin login successful',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: admin._id.toString(), email: admin.email, fullName: 'Administrator', role: 'admin' },
    });
  } catch (error) {
    logger.error(`Admin Login Error:`, { message: error.message, stack: error.stack, email });
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "An internal error occurred." });
  }
};

/**
 * @desc   Create a new admin user
 * @route  POST /api/admin/create
 * @access Private/Admin
 */
exports.createAdmin = async (req, res) => {
  const { email, password } = req.body;
  const reqId = req.id || Date.now().toString(36);
  const creatingAdminEmail = req.user?.email || 'UnknownAdmin';

  logger.info(`[AdminCtrl-${reqId}] Admin creation attempt: New admin email ${email} by ${creatingAdminEmail}`);

  if (!email || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Email and password are required for new admin."
    });
  }
  if (password.length < 8) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "New admin password must be at least 8 characters long."
    });
  }

  try {
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      logger.warn(`[AdminCtrl-${reqId}] Admin creation failed: Email ${email.toLowerCase()} already exists.`);
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "An admin account with this email already exists."
      });
    }

    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password: password,
    });
    await newAdmin.save();

    logger.info(`[AdminCtrl-${reqId}] New admin account created successfully: ${newAdmin.email} by ${creatingAdminEmail}.`);
    
    const adminResponseData = {
      id: newAdmin._id.toString(),
      email: newAdmin.email,
      createdAt: newAdmin.createdAt
    };

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Admin account created successfully.",
      admin: adminResponseData,
    });

  } catch (error) {
    logger.error(`[AdminCtrl-${reqId}] Create Admin Error:`, { message: error.message, stack: error.stack, email });
    if (error.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Validation failed while creating admin.",
        errors: error.errors
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create admin account due to an internal error."
    });
  }
};

/**
 * @desc   Get all users with pagination and filtering
 * @route  GET /api/admin/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { role, status, verified, search } = req.query;
    let filterQuery = { deleted: { $ne: true } };

    if (role && role !== 'ALL') filterQuery.role = role;
    if (status && status !== 'ALL') filterQuery.isActive = status === 'ACTIVE';
    if (verified && verified !== 'ALL') filterQuery.emailVerified = verified === 'VERIFIED';
    if (search && search.trim()) {
      filterQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filterQuery).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const totalUsers = await User.countDocuments(filterQuery);

    // ✅ UPDATED TRANSFORMATION FOR LIST VIEW
    const transformedUsers = users.map(user => ({
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      subscription: user.subscription || { status: 'none' } // Pass subscription object for badge
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Users fetched successfully.",
      data: transformedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit
      }
    });
  } catch (error) {
    logger.error(`Error fetching all users:`, { message: error.message, stack: error.stack });
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch users." });
  }
};

/**
 * @desc   Get a specific user by ID
 * @route  GET /api/admin/users/:userId
 * @access Private/Admin
 */
exports.getUserById = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid user ID format." });
  }

  try {
    const user = await User.findById(userId).select('-password').lean();
    if (!user || user.deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found." });
    }

    // ✅ FULLY UPDATED TRANSFORMATION FOR DETAIL VIEW
    const transformedUser = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      contact: user.contact,
      collegeName: user.collegeName,
      district: user.district,
      tehsil: user.tehsil,
      pincode: user.pincode,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      isVerified: user.emailVerified, // For frontend compatibility
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      
      subscription: user.subscription || { status: 'none', plan: null, startDate: null, endDate: null },
      
      coins: user.coins || 0,
      totalCoinsEarned: user.totalCoinsEarned || 0,
      totalCoinsSpent: user.totalCoinsSpent || 0,
      availableSpins: user.availableSpins || 0,
      usedRewardsCount: user.usedRewards?.length || 0,

      authProvider: user.authProvider || 'email',
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount || 0,

      submissionStats: user.submissionStats || {
        totalSubmissions: 0,
        approvedSubmissions: 0,
        rejectedSubmissions: 0,
        lastSubmissionAt: null
      }
    };

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User fetched successfully.",
      data: transformedUser
    });
  } catch (error) {
    logger.error(`Error fetching user by ID:`, { message: error.message, stack: error.stack, userId });
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch user details." });
  }
};

/**
 * @desc   Update a user's information
 * @route  PUT /api/admin/users/:userId
 * @access Private/Admin
 */
exports.updateUser = async (req, res) => {
    // This function remains the same as in your provided code
    const { userId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid user ID format." });
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.deleted) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found." });
        }

        const allowedFields = ['fullName', 'contact', 'collegeName', 'district', 'tehsil', 'pincode'];
        const filteredUpdates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                filteredUpdates[key] = updateData[key];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { ...filteredUpdates, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-password');

        return res.status(StatusCodes.OK).json({ success: true, message: "User updated successfully.", data: updatedUser });
    } catch (error) {
        logger.error(`Error updating user:`, { message: error.message, userId });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to update user." });
    }
};

/**
 * @desc   Delete a user (soft delete)
 * @route  DELETE /api/admin/users/:userId
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
    // This function remains the same
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid user ID." });
    }
    try {
        const user = await User.findById(userId);
        if (!user || user.deleted) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found." });
        }
        await User.findByIdAndUpdate(userId, { deleted: true, deletedAt: new Date(), isActive: false });
        return res.status(StatusCodes.OK).json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        logger.error(`Error deleting user:`, { message: error.message, userId });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to delete user." });
    }
};

/**
 * @desc   Toggle user status (active/inactive)
 * @route  PATCH /api/admin/users/:userId/toggle-status
 * @access Private/Admin
 */
exports.toggleUserStatus = async (req, res) => {
    // This function remains the same
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid user ID." });
    }
    try {
        const user = await User.findById(userId);
        if (!user || user.deleted) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found." });
        }
        const newStatus = !user.isActive;
        await User.findByIdAndUpdate(userId, { isActive: newStatus, updatedAt: new Date() });
        return res.status(StatusCodes.OK).json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'}.`, data: { isActive: newStatus } });
    } catch (error) {
        logger.error(`Error toggling user status:`, { message: error.message, userId });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to toggle status." });
    }
};

/**
 * @desc   Toggle user verification status
 * @route  PATCH /api/admin/users/:userId/toggle-verification
 * @access Private/Admin
 */
exports.toggleUserVerification = async (req, res) => {
    // This function remains the same
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid user ID." });
    }
    try {
        const user = await User.findById(userId);
        if (!user || user.deleted) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "User not found." });
        }
        const newVerificationStatus = !user.emailVerified;
        await User.findByIdAndUpdate(userId, { emailVerified: newVerificationStatus, updatedAt: new Date() });
        return res.status(StatusCodes.OK).json({ success: true, message: `User ${newVerificationStatus ? 'verified' : 'unverified'}.`, data: { emailVerified: newVerificationStatus } });
    } catch (error) {
        logger.error(`Error toggling verification:`, { message: error.message, userId });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to toggle verification." });
    }
};
/**
 * @desc   Admin sends a reward email to a user
 * @route  POST /api/admin/send-reward-email
 * @access Private (Admin)
 */
exports.sendRewardEmail = async (req, res) => {
  const { to, subject, text, html } = req.body;
  const adminEmail = req.user.email;

  if (!to || !subject || !text) {
      return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Recipient (to), subject, and text body are required.",
      });
  }

  try {
      await emailService.sendEmail({ to, subject, text, html });
      logger.info(`Admin ${adminEmail} successfully sent reward email to ${to}`);
      return res.status(StatusCodes.OK).json({
          success: true,
          message: `Email successfully sent to ${to}.`,
      });
  } catch (error) {
      logger.error(`Admin ${adminEmail} failed to send email to ${to}. Error: ${error.message}`);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to send email due to a server error.",
      });
  }
};

