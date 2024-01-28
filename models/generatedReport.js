const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const generatedReportSchema = new Schema({
    office: {
        type: Schema.Types.ObjectId,
        refPath: 'onModel',
        required: true
    },
    onModel: {
        type: String,
        required: true,
        enum: ['OfficeUser', 'OfficeAdmin'],
    },
    reports: {
        type: Array,
        required: true,
        default: []
    },
    reportType: {
        type: String,
        required: true
    },
    expire_at: {
        type: Date, 
        default: Date.now() + (60*60*24*1000),
        expires: 60*60*24*7
    }
},
{
    timestamps: true
});

module.exports = mongoose.model('GeneratedReport', generatedReportSchema);