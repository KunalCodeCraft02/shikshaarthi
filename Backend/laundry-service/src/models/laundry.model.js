// backend/laundry-service/src/models/laundry.model.js
const mongoose = require('mongoose');

const laundrySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    
    // Basic Information
    name: { type: String, required: [true, "Owner's name is required"], trim: true, minLength: 3 },
    mobile: { 
        type: String, 
        required: [true, "Mobile number is required"], 
        trim: true,
        validate: {
            validator: function(v) {
                return /^[6-9]\d{9}$/.test(v);
            },
            message: 'Mobile number must be 10 digits starting with 6-9'
        }
    },
    email: { 
        type: String, 
        trim: true, 
        lowercase: true,
        validate: {
            validator: function(v) {
                return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    
    // Address Information
    address: { type: String, required: [true, "Address is required"], trim: true, minLength: 10 },
    pincode: { 
        type: String, 
        required: [true, "Pincode is required"], 
        trim: true,
        validate: {
            validator: function(v) {
                return /^\d{6}$/.test(v);
            },
            message: 'Pincode must be exactly 6 digits'
        }
    },
    district: { type: String, required: [true, "District is required"], trim: true, index: true },
    state: { type: String, required: [true, "State is required"], trim: true },
    
    // Service Details
    costPerKg: { 
        type: Number, 
        required: [true, "Cost per Kg is required"],
        min: [0.01, 'Cost per kg must be greater than 0']
    },
    laundryType: { 
        type: String, 
        enum: ['Regular', 'Dry Cleaning', 'Heavy Wash'],
        default: "Regular" 
    },
    ironing: { type: Boolean, default: false },
    returnDays: { 
        type: Number, 
        required: [true, "Return days are required"],
        min: [1, 'Return days must be at least 1'],
        max: [30, 'Return days cannot exceed 30']
    },
    
    serviceType: { 
        type: String, 
        enum: ['Shop', 'Individual'],
        required: [true, "Service type is required"],
        default: "Shop" 
    },
    
    totalAmount: { 
        type: Number,
        default: function() {
            const base = this.costPerKg || 0;
            const ironingCost = this.ironing ? base * 0.5 : 0;
            return +(base + ironingCost).toFixed(2);
        }
    },
    
    imageUrls: [{
        _id: false,
        url: { type: String, required: true },
        cloudinaryId: { type: String, required: true },
        label: { type: String }
    }],
        
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true // [longitude, latitude]
        }
    },

    verificationStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'rejected'], 
        default: 'pending' 
    },
    
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'laundry_data_submissions'
});

// Create indexes for efficient queries
laundrySchema.index({ location: '2dsphere' });
laundrySchema.index({ district: 1, state: 1, pincode: 1 });
laundrySchema.index({ serviceType: 1 });
laundrySchema.index({ laundryType: 1 });
laundrySchema.index({ mobile: 1 });
laundrySchema.index({ verificationStatus: 1 });

// Pre-save middleware to calculate totalAmount
laundrySchema.pre('save', function(next) {
    if (this.costPerKg) {
        const base = this.costPerKg;
        const ironingCost = this.ironing ? base * 0.5 : 0;
        this.totalAmount = +(base + ironingCost).toFixed(2);
    }
    next();
});

// Virtual for formatted cost display
laundrySchema.virtual('formattedCost').get(function() {
    return `₹${this.totalAmount?.toFixed(2) || '0.00'} per kg`;
});

// Method to get appropriate image labels based on service type
laundrySchema.methods.getImageLabels = function() {
    if (this.serviceType === 'Shop') {
        return [ 'Outside Image', 'Inside Image', 'Visiting Card/Info Board', 'Additional Photo 1', 'Additional Photo 2' ];
    } else {
        return [ 'Photo of the Person', 'Address Proof Photo', 'Aadhar Card Photo', 'Visiting Card/Info (if any)', 'Additional Photo' ];
    }
};

module.exports = mongoose.model('Laundry', laundrySchema);