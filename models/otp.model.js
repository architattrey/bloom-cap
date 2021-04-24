var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var userOtp = mongoose.Schema({
    mobile: {
        type: String,
        validate: {
            validator: function (v) {
                return /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/.test(v);
            },
            message: '{VALUE} is not a valid mobile number!'
        },
        required: [true, 'Please provide your mobile number'],
    },
    otp: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }, //By default true means Active
});
userOtp.plugin(timestamps);
module.exports = mongoose.model('userOtp', userOtp);