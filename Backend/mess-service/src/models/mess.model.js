// const mongoose = require('mongoose');

// // This schema reads from the collection where approved mess data is stored.
// const messSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
//     centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
//     name: { type: String, required: true, trim: true },
//     description: { type: String, required: true },
//     price: { type: String, required: true, trim: true },
//     address: { type: String, required: true, trim: true },
//     district: { type: String, required: true, index: true },
//     state: { type: String, required: true, trim: true },
//     pincode: { type: String, required: true, index: true },
//     messType: { type: String, required: true },
//     holderName: { type: String, required: true },
//     mobile: { type: String, required: true },
//     imageUrls: [{ _id: false, url: String, cloudinaryId: String }],
//     location: {
//         type: { type: String, enum: ['Point'], required: true },
//         coordinates: { type: [Number], required: true }
//     },
// }, { 
//   timestamps: true, 
//   collection: 'mess_data_submissions' 
// });

// // The 2dsphere index is crucial for location-based searches.
// messSchema.index({ location: '2dsphere' });

// module.exports = mongoose.model('Mess', messSchema);



//mess-service/src/controllers/mess.controller.js
const mongoose = require('mongoose');

const messSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: String, required: true, trim: true },
    // ====================== FIELD ADDED HERE ======================
    timing: { type: String, required: true },
    // =============================================================
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, index: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, index: true },
    messType: { type: String, required: true },
    holderName: { type: String, required: true },
    mobile: { type: String, required: true },
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
}, { 
  timestamps: true, 
  collection: 'mess_data_submissions' 
});

messSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Mess', messSchema);