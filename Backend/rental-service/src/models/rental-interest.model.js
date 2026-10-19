// rental-service/src/models/rental-interest.model.js
const mongoose = require('mongoose');

const rentalInterestSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
    },
    rentalId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        // =================================================================
        // THE FIX: The 'ref' should point to the Mongoose Model name, 
        // which is 'Rental' from your rental.model.js file.
        // =================================================================
        ref: 'Rental', 
    },
    userName: { type: String },
    userEmail: { type: String },
    rentalName: { type: String },
}, {
    timestamps: true,
    collection: 'rental_interests'
});

rentalInterestSchema.index({ userId: 1, rentalId: 1 }, { unique: true });
rentalInterestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RentalInterest', rentalInterestSchema);