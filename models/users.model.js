var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var users = mongoose.Schema({
    timestamp: Number,
    profileImgUrl: String,
    fullName: String,
    mobile: {
        type: String,
        validate: {
            validator: function (v) {
                return /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/.test(v);
            },
            message: '{VALUE} is not a valid phone number!'
        },
        required: [true, 'Phone number is missing. Please provide your mobile number'],
        unique: true
    },
    email: String,
    password: String,
    city: String,
    pinCode: Number,
    segment: {
        type: ObjectId,
        ref: 'segments'
    },
    subSegment: {
        type: ObjectId,
        ref: 'subSegments'
    },
    schoolName: String,
    isMobileVerified: {
        type: Boolean,
        default: 0
    },
    isEmailVerified: {
        type: Boolean,
        default: 0
    },
    otp: {
        type: Number,
        default: 0
    },
    otpSentOn: {
        type: Number,
        default: 0
    },
    mailVerificationUrl: {
        type: String,
        default: ''
    },
    mailVerificationUrlSentOn: {
        type: Number,
        default: 0
    },
    deviceDetails: {
        pushId: {
            type: String,
            default: ''
        },
        imeiNo: {
            type: String,
            default: ''
        },
        deviceType: {
            type: String,
            default: ''
        },
        facebookSocialToken: {
            type: String,
            default: ''
        },
        googleSocialToken: {
            type: String,
            default: ''
        }
    },
    createdBy: {
        type: String,
        default: ''
    },
    isSchool: {
        type: Boolean,
        default: true
    }, //By default true means Active
    isActive: {
        type: Boolean,
        default: true
    }, //By default true means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default false means Not Deleted
});

users.plugin(timestamps);
module.exports = mongoose.model('users', users);