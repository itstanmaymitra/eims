const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const officeAdminSchema = new Schema({
    officeName: {
        type: String,
        required: true
    },
    officeAddress: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required: true,
        default: 'OfficeAdmin'
    }
}, 
{
    timestamps: true
});

module.exports = mongoose.model('OfficeAdmin', officeAdminSchema);