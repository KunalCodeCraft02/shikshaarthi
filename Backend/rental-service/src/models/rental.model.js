// rental-service/src/models/rental.model.js

const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
    // All fields from your rental_data_submissions collection are here
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, index: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, index: true },
    amenities: { type: String, default: "" },
    rules: { type: String, default: "" },
    sharing: { type: String, default: "" },
    holderName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    imageUrls: [{ _id: false, url: String, cloudinaryId: String }],
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true }
    },
  //   verificationStatus: { 
  //     type: String, 
  //     enum: ['pending', 'verified', 'rejected'], 
  //     default: 'pending' 
  // },
    // We remove the 'status' field because it's not in rental_data_submissions
    // status: { ... }  <-- THIS FIELD IS REMOVED
}, { 
  timestamps: true, 
  // ===================================================================
  // THE MOST IMPORTANT CHANGE: Pointing to the correct collection name
  // ===================================================================
  collection: 'rental_data_submissions' 
});

// The 2dsphere index is crucial for location-based searches
rentalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Rental', rentalSchema);

