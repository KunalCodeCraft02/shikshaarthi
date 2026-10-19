// //Backend/auth-service/src/models/User.js
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const logger = require('../config/logger');

// // NOTE: This is a cross-service dependency. While it works, a more robust,
// // decoupled architecture for a large application would use an event-driven approach
// // (e.g., message queue) to communicate between services instead of direct code imports.
// const { getModel: getCoinTransactionModel } = require('../../../rewards-service/src/models/CoinTransaction.model');

// const userSchema = new mongoose.Schema({
//   // --- Core Profile Details ---
//   fullName: {
//     type: String,
//     required: [true, 'Full name is required'],
//     trim: true,
//     minlength: [3, 'Full name must be at least 3 characters']
//   },
//   email: {
//     type: String,
//     required: [true, 'Email is required'],
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
//   },
//   password: {
//     type: String,
//     // Password is only required for the 'email' auth provider.
//     required: function() { return this.authProvider === 'email'; },
//     minlength: [8, 'Password must be at least 8 characters'],
//     select: false, // Security Best Practice: Don't return password in queries by default.
//   },
//   contact: {
//     type: String,
//     required: [true, 'Contact number is required'],
//     match: [/^[6-9]\d{9}$/, 'Invalid contact number, must be 10 digits and start with 6-9']
//   },
//   profilePicture: {
//     type: String,
//     default: null
//   },

//   // --- Location & College Details ---
//   collegeName: { type: String, required: [true, 'College name is required'], trim: true },
//   district: { type: String, required: [true, 'District is required'], trim: true },
//   tehsil: { type: String, required: [true, 'Tehsil is required'], trim: true },
//   pincode: { type: String, required: [true, 'Pincode is required'], match: [/^\d{6}$/, 'Invalid pincode'] },

//   // --- Account & Status Management ---
//   role: {
//     type: String,
//     enum: ['user', 'admin'],
//     default: 'user'
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   emailVerified: {
//     type: Boolean,
//     default: false
//   },
//   subscriptionStatus: {
//     type: String,
//     enum: ['active', 'inactive', 'cancelled', 'none', 'expired'],
//     default: 'none'
//   },

//   // --- Authentication & Security ---
//   authProvider: {
//     type: String,
//     enum: ['email', 'google'],
//     default: 'email'
//   },
//   googleId: {
//     type: String,
//     unique: true,
//     sparse: true, // Creates a unique index but allows multiple null values.
//     default: null
//   },
//   lastLoginAt: { type: Date },
//   lastSeenAt: { type: Date },
//   loginCount: { type: Number, default: 0, min: 0 },
//   lastPasswordResetAt: { type: Date },
//   passwordResetCount: { type: Number, default: 0 },

//   // --- Coin, Reward & Spin System ---
//   coins: {
//     type: Number,
//     required: true,
//     default: 50, // REQUIREMENT: New users start with 50 coins.
//     min: [0, 'Coin balance cannot be negative.']
//   },
//   totalCoinsEarned: {
//     type: Number,
//     default: 50, // Starts with the 50 signup coins.
//     min: 0
//   },
//   totalCoinsSpent: {
//     type: Number,
//     default: 0,
//     min: 0
//   },
//   lastCoinsUpdate: { type: Date },
//   availableSpins: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },

//   // --- Submission Statistics ---
//   submissionStats: {
//     totalSubmissions: { type: Number, default: 0, min: 0 },
//     approvedSubmissions: { type: Number, default: 0, min: 0 },
//     rejectedSubmissions: { type: Number, default: 0, min: 0 },
//     lastSubmissionAt: { type: Date, default: null }
//   },

//   // --- Soft Delete ---
//   deleted: {
//     type: Boolean,
//     default: false,
//     index: true
//   },
//   deletedAt: { type: Date },

// }, {
//   collection: 'users',
//   timestamps: true, // Automatically adds `createdAt` and `updatedAt`
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // --- VIRTUALS (Calculated properties that don't exist in the DB) ---
// userSchema.virtual('isOnline').get(function() {
//   if (!this.lastSeenAt) return false;
//   // User is considered online if last seen within the last 5 minutes.
//   const fiveMinutes = 5 * 60 * 1000;
//   return (Date.now() - this.lastSeenAt.getTime()) < fiveMinutes;
// });

// // --- INDEXES (For query performance) ---
// userSchema.index({ coins: -1 }); // For leaderboards
// userSchema.index({ role: 1 }); // For filtering admins/users
// userSchema.index({ collegeName: 1, district: 1 }); // For location-based queries

// // --- HOOKS (Middleware for the schema) ---

// // Pre-save hook to automatically hash the password before saving.
// userSchema.pre('save', async function (next) {
//   // Only hash the password if it has been modified (or is new).
//   if (!this.isModified('password') || !this.password) {
//     return next();
//   }

//   try {
//     const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '10'));
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     logger.error(`[UserSchema] Error hashing password for ${this.email}:`, error);
//     next(error); // Pass error to the next middleware/handler
//   }
// });

// // Post-save hook to log the initial 50 coin signup bonus transaction.
// userSchema.post('save', async function(doc, next) {
//   // `isNew` is a boolean Mongoose property. It's true only on initial document creation.
//   if (this.isNew) {
//     try {
//       const CoinTransaction = getCoinTransactionModel();
//       if (!CoinTransaction) {
//         logger.warn(`[UserSchema] CoinTransaction model not available. Skipping signup bonus log for ${doc.email}.`);
//         return next();
//       }
//       await CoinTransaction.create({
//         userId: doc._id,
//         userEmail: doc.email,
//         type: 'signup_bonus', // Logs the signup bonus accurately
//         amount: 50,
//         description: 'Welcome bonus for creating a new account.',
//       });
//       logger.info(`[User ${doc.email}] Successfully logged 50 coin signup bonus transaction.`);
//     } catch (error) {
//       // IMPORTANT: Don't block the user creation process if this logging fails.
//       logger.error(`[UserSchema] Failed to create signup bonus transaction for ${doc.email}:`, error);
//     }
//   }
//   next();
// });

// // --- INSTANCE METHODS (Methods available on a specific user document) ---

// // Compares a candidate password with the user's hashed password.
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   if (!this.password) return false;
//   return bcrypt.compare(candidatePassword, this.password);
// };

// // Atomically updates a user's coins and lifetime totals.
// userSchema.methods.updateCoins = async function (amount, reasonContext) {
//   if (typeof amount !== 'number') {
//     throw new Error('Amount must be a number.');
//   }
//   if (this.coins + amount < 0) {
//     throw new Error('Insufficient coins for this operation.');
//   }

//   this.coins += amount;
//   this.lastCoinsUpdate = new Date();

//   if (amount > 0) {
//     this.totalCoinsEarned += amount;
//   } else if (amount < 0) {
//     this.totalCoinsSpent += Math.abs(amount);
//   }

//   logger.info(`[User ${this.email}] Coins updated by ${amount}. Reason: ${reasonContext}. New balance: ${this.coins}`);
//   return this.save(); // Return the promise from save()
// };

// // Updates user fields upon a successful login.
// userSchema.methods.handleLogin = function () {
//   this.lastLoginAt = new Date();
//   this.lastSeenAt = new Date();
//   this.loginCount += 1;
//   return this.save({ validateModifiedOnly: true });
// };

// // --- STATIC METHODS (Methods available on the User model itself) ---

// // Finds a user by email, automatically excluding soft-deleted accounts.
// userSchema.statics.findByEmail = function (email) {
//   return this.findOne({ email: email.toLowerCase(), deleted: { $ne: true } });
// };

// module.exports = mongoose.model('User', userSchema);

// Backend/auth-service/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const { getModel: getCoinTransactionModel } = require('../../../rewards-service/src/models/CoinTransaction.model');

const userSchema = new mongoose.Schema({
  // --- Core Profile Details ---
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [3, 'Full name must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  password: {
    type: String,
    // Password is only required for the 'email' auth provider.
    required: function() { return this.authProvider === 'email'; },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Security Best Practice: Don't return password in queries by default.
  },
  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[6-9]\d{9}$/, 'Invalid contact number, must be 10 digits and start with 6-9']
  },
  profilePicture: {
    type: String,
    default: null
  },

  // --- Location & College Details ---
  collegeName: { type: String, required: [true, 'College name is required'], trim: true },
  district: { type: String, required: [true, 'District is required'], trim: true },
  tehsil: { type: String, required: [true, 'Tehsil is required'], trim: true },
  pincode: { type: String, required: [true, 'Pincode is required'], match: [/^\d{6}$/, 'Invalid pincode'] },
 
  // --- THE FIX: Add the GeoJSON location field ---
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // Standard: [longitude, latitude]
      default: [0, 0] // Default to a neutral point if lookup fails
    }
  },

  // --- Account & Status Management ---
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },

  // --- NEW: Detailed Subscription Management ---
  subscription: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired', 'none'],
      default: 'none'
    },
    plan: { type: String, default: null }, // e.g., 'annual_199'
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
  },
  // --- DEPRECATED (but kept for backward compatibility during transition) ---
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'none', 'expired'],
    default: 'none',
    endDate: { type: Date, default: null },
  },

  // --- Authentication & Security ---
  authProvider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Creates a unique index but allows multiple null values.
    default: null
  },
  lastLoginAt: { type: Date },
  lastSeenAt: { type: Date },
  loginCount: { type: Number, default: 0, min: 0 },
  lastPasswordResetAt: { type: Date },
  passwordResetCount: { type: Number, default: 0 },

  // --- Coin, Reward & Spin System ---
  coins: {
    type: Number,
    required: true,
    default: 50, // REQUIREMENT: New users start with 50 coins.
    min: [0, 'Coin balance cannot be negative.']
  },
  totalCoinsEarned: {
    type: Number,
    default: 50, // Starts with the 50 signup coins.
    min: 0
  },
  totalCoinsSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastCoinsUpdate: { type: Date },
  availableSpins: {
    type: Number,
    default: 0,
    min: 0,
  },
  // --- NEW: Track used one-time rewards like subscription discounts ---
  usedRewards: [{
      redemptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RewardRedemption',
        required: true
      },
      rewardName: {
        type: String,
        required: true
      },
      usedAt: {
        type: Date,
        default: Date.now
      }
  }],

  // --- Submission Statistics ---
  submissionStats: {
    totalSubmissions: { type: Number, default: 0, min: 0 },
    approvedSubmissions: { type: Number, default: 0, min: 0 },
    rejectedSubmissions: { type: Number, default: 0, min: 0 },
    lastSubmissionAt: { type: Date, default: null }
  },

  // --- Soft Delete ---
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: { type: Date },

}, {
  collection: 'users',
  timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- VIRTUALS (Calculated properties that don't exist in the DB) ---
userSchema.virtual('isSubscribed').get(function() {
    // A user is subscribed if their status is active and the end date is in the future.
    return this.subscription.status === 'active' && this.subscription.endDate && this.subscription.endDate > new Date();
});

// --- INDEXES (For query performance) ---
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ coins: -1 }); // For leaderboards
userSchema.index({ role: 1 }); // For filtering admins/users
userSchema.index({ collegeName: 1, district: 1 }); // For location-based queries
userSchema.index({ 'subscription.status': 1 }); // To quickly find active/inactive users
userSchema.index({ 'subscription.endDate': 1 }); // For cron jobs to check for expired subs

// --- HOOKS (Middleware for the schema) ---

// Pre-save hook to automatically hash the password before saving.
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new).
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '10'));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    logger.error(`[UserSchema] Error hashing password for ${this.email}:`, error);
    next(error); // Pass error to the next middleware/handler
  }
});

// Post-save hook to log the initial 50 coin signup bonus transaction.
userSchema.post('save', async function(doc, next) {
  // `isNew` is a boolean Mongoose property. It's true only on initial document creation.
  if (this.isNew) {
    try {
      // Lazy load model to prevent circular dependency issues in complex setups
      const CoinTransaction = mongoose.model('CoinTransaction');
      
      await CoinTransaction.create({
        userId: doc._id,
        userEmail: doc.email,
        type: 'signup_bonus',
        amount: 50,
        description: 'Welcome bonus for creating a new account.',
        balanceAfter: 50
      });
      logger.info(`[User ${doc.email}] Successfully logged 50 coin signup bonus transaction.`);
    } catch (error) {
      // IMPORTANT: Don't block the user creation process if this logging fails.
      logger.error(`[UserSchema] Failed to create signup bonus transaction for ${doc.email}:`, error);
    }
  }
  next();
});

// --- INSTANCE METHODS (Methods available on a specific user document) ---

/**
 * Compares a candidate password with the user's hashed password.
 * @param {string} candidatePassword - The password to compare.
 * @returns {Promise<boolean>} - True if passwords match.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Atomically updates a user's coins and lifetime totals, and creates a transaction record.
 * @param {number} amount - The amount to add (positive) or deduct (negative).
 * @param {string} reason - A short string describing the transaction reason.
 * @param {object} metadata - Optional metadata for the transaction log.
 * @returns {Promise<User>} - The saved user document.
 */
userSchema.methods.updateCoins = async function (amount, reason, metadata = {}) {
  if (typeof amount !== 'number') {
    throw new Error('Amount must be a number.');
  }
  if (this.coins + amount < 0) {
    throw new Error('Insufficient coins for this operation.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const CoinTransaction = mongoose.model('CoinTransaction');

    this.coins += amount;
    this.lastCoinsUpdate = new Date();

    if (amount > 0) {
      this.totalCoinsEarned += amount;
    } else if (amount < 0) {
      this.totalCoinsSpent += Math.abs(amount);
    }

    await CoinTransaction.create([{
        userId: this._id,
        userEmail: this.email,
        type: reason.toLowerCase().replace(/ /g, '_'),
        amount: amount,
        description: reason,
        balanceAfter: this.coins,
        metadata
    }], { session });

    await this.save({ session });
    await session.commitTransaction();

    logger.info(`[User ${this.email}] Coins updated by ${amount}. Reason: ${reason}. New balance: ${this.coins}`);
    return this;
  } catch (error) {
    await session.abortTransaction();
    logger.error(`[User ${this.email}] Failed to update coins. Transaction aborted.`, error);
    throw new Error('Coin update transaction failed.');
  } finally {
    session.endSession();
  }
};

// --- STATIC METHODS (Methods available on the User model itself) ---

/**
 * Finds a user by email, automatically excluding soft-deleted accounts.
 * @param {string} email - The user's email address.
 * @returns {mongoose.Query} - A Mongoose query object.
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase(), deleted: { $ne: true } });
};

module.exports = mongoose.model('User', userSchema);