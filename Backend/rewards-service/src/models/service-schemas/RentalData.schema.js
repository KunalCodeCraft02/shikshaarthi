
// Backend/rewards-service/src/models/service-schemas/RentalData.schema.js
const mongoose = require('mongoose');

const rentalDataSchema = new mongoose.Schema({
  centralSubmissionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  
  name: { type: String, required: [true, "Property/Room name is required"], trim: true, minlength: [3, "Property name must be at least 3 characters long"] },
  price: { type: String, required: [true, "Price is required"], trim: true },
  type: { type: String, required: [true, "Room/Property type is required"], enum: { values: ['PG', 'Hostel', 'Apartment', 'Shared Room', 'House', 'Flat', '1BHK', '2BHK', '1RK', 'Single Room'], message: 'Invalid property type' }},
  sharing: { type: String, trim: true, default: "" },
  rules: { type: String, trim: true, default: "" },
  
  address: { type: String, required: [true, "Address is required"], trim: true, minlength: [10, "Address must be at least 10 characters long"] },
  district: { type: String, required: [true, "District is required"], trim: true },
  state: { type: String, required: [true, "State is required"], trim: true },
  pincode: { type: String, required: [true, "Pincode is required"], trim: true, validate: { validator: v => /^\d{6}$/.test(v), message: 'Pincode must be a 6-digit number' }},
  
  amenities: { type: String, trim: true, default: "" },
  
  holderName: { type: String, required: [true, "Owner name is required"], trim: true, minlength: [3, "Owner name must be at least 3 characters long"] },
  mobile: { type: String, required: [true, "Owner mobile is required"], trim: true, validate: { validator: v => /^[6-9]\d{9}$/.test(v), message: 'Mobile number must be 10 digits and start with 6-9' }},
  email: { type: String, trim: true, lowercase: true, validate: { validator: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Please enter a valid email address' }},
  
  imageUrls: [{ _id: false, url: String, cloudinaryId: String }],
  
  location: {
    type: {
        type: String,
        enum: ['Point'],
    },
    coordinates: {
        type: [Number],
    }
  },
  // =======================================================================
  // ADDED: The verificationStatus field to track the approval state.
  // =======================================================================
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
},
{
  timestamps: true,
  collection: 'rental_data_submissions',
});

rentalDataSchema.index({ location: '2dsphere' }, { sparse: true });
rentalDataSchema.index({ district: 1, state: 1, pincode: 1 });
rentalDataSchema.index({ type: 1 });
rentalDataSchema.index({ price: 1 });

module.exports = rentalDataSchema;