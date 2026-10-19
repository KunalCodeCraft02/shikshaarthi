// Backend/auth-service/src/models/College.js
const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  college: { type: String, required: true },
  district: { type: String, required: true, index: true },
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
  geocoding: {
    display_name: String,
    confidence: Number
  }
});

collegeSchema.index({ location: '2dsphere' });
collegeSchema.index({ college: 'text', district: 'text' }); // For text search

module.exports = mongoose.model('College', collegeSchema);