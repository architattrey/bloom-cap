var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var loginHistory = mongoose.Schema({
    userId: { type: ObjectId, ref: 'users' },
    usetName: String,
    loginTime: Number,
    status: String,
    deviceType: String
});
loginHistory.plugin(timestamps);
module.exports = mongoose.model('loginHistory', loginHistory);