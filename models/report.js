const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const reportSchema = new Schema({
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    suffered_consumers: {
        type: Number,
        required: true
    },
    interruption_area: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    office: {
        type: Schema.Types.ObjectId,
        ref: 'OfficeUser',
        required: true
    }
}, 
{
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);