// plumber-service/src/models/plumber.model.js
const mongoose = require('mongoose');

const plumberSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true },
    experience: { type: Number, required: true },
    specialization: { type: String, default: 'General Plumbing' },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, index: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, index: true },
    imageUrls: [{ _id: false, url: String, cloudinaryId: String }],
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
     verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    isActive: { type: Boolean, default: true }
}, { 
  timestamps: true, 
  collection: 'plumber_data_submissions' // Matches the rewards-service collection
});

// Create a 2dsphere index for geospatial queries
plumberSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Plumber', plumberSchema);