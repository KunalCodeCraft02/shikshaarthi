// Backend/medical-service/src/models/medical.model.js
const mongoose = require('mongoose');

// This schema reads from the collection where APPROVED medical data is stored.
const medicalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, index: true },
    pincode: { type: String, required: true, index: true },
    mobile: { type: String, required: true },
    operatingHours: { open: String, close: String },
    services: String,
    specialization: String,
    imageUrls: [{ _id: false, url: String, cloudinaryId: String }],
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
  //   verificationStatus: { 
  //     type: String, 
  //     enum: ['pending', 'verified', 'rejected'], 
  //     default: 'pending' 
  // },
}, { 
  timestamps: true, 
  collection: 'medical_data_submissions' 
});

// This index is perfect and essential for the $near query to work.
medicalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Medical', medicalSchema);