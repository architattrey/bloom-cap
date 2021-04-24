var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var studentSchema = mongoose.Schema({
    schoolName: {
        type: String
    },
    password: {
        type: String,
        default: ''
    },
    segment: {
        type: ObjectId,
        ref: 'segments'
    },
    school: {
        type: String,
        ref: 'schools',
        default: ''
    },
    subSegment: {
        type: ObjectId,
        ref: 'subSegments'
    },
    studentMobileNo: {
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
    name: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: ''
    },
    authToken: {
        type: String,
        default: ''
    },
    section: {
        type: String,
        default: ''
    },
    dob: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        default: ''
    },
    motherName: {
        type: String,
        default: ''
    },
    motherMobileNo: {
        type: String,
        default: ''
    },
    fatherName: {
        type: String,
        default: ''
    },
    fatherMobileNo: {
        type: String,
        default: ''
    },
    guardianName: {
        type: String,
        default: ''
    },
    guardianMobileNo: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        unique: true
    },
    address: {
        type: String,
        default: ''
    },
    state: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: ''
    },
    pinCode: {
        type: Number,
        default: 0
    },
    deviceDetails: {
        pushId: {
            type: String,
            default: ''
        },
        timestamp: {
            type: Number,
            default: 0
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
    trainerName: {
        type: String,
        default: ''
    },
    registrationDate: {
        type: String,
        default: ''
    },
    //  android | ios | web | excel
    registrationMethod: {
        type: String,
        default: '',
        lowercase: true,
        get: v => v.toLowerCase()
    },
    isSchool: {
        type: Boolean,
        default: true
    }, //By default true means student belongs to Board
    isActive: {
        type: Boolean,
        default: true
    }, //By default true means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default false means Not Deleted
});
studentSchema.plugin(timestamps);
module.exports = mongoose.model('students1', studentSchema);