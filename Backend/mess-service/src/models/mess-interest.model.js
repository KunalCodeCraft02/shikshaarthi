const mongoose = require('mongoose');

const messInterestSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
    },
    messId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'Mess', 
    },
    userName: { type: String },
    userEmail: { type: String },
    messName: { type: String },
}, {
    timestamps: true,
    collection: 'mess_interests'
});

messInterestSchema.index({ userId: 1, messId: 1 }, { unique: true });

module.exports = mongoose.model('MessInterest', messInterestSchema);