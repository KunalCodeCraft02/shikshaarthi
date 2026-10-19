// Backend/shared/schemas/liveRental.schema.js (FULL CODE)
const mongoose = require('mongoose');

const liveRentalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, index: true },
    pincode: { type: String, required: true, index: true },
    amenities: { type: String, default: "" },
    rules: { type: String, default: "" },
    holderName: { type: String, required: true },
    mobile: { type: String, required: true },
    imageUrls: [{
        _id: false,
        url: String,
        cloudinaryId: String
    }],
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'pending_verification'],
        default: 'available' // Live data should default to available
    }
}, { timestamps: true, collection: 'rentals' }); // Explicitly set collection name to 'rentals'

liveRentalSchema.index({ location: '2dsphere' });

// ONLY EXPORT THE SCHEMA ITSELF
module.exports = liveRentalSchema;