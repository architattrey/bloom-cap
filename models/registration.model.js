var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var student = mongoose.Schema({
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
        type: ObjectId,
        ref: 'schools'
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
        required: [true, 'Phone number is missing. Please provide your mobile number']
        //unique: true
    },
    name: {
        type: String,
        required: true
    },
    authToken: {
        type: String
    },
    class: String,
    section: String,
    dob: String,
    gender: String,
    motherName: String,
    motherMobileNo: {
        type: String
    },
    fatherName: String,
    fatherMobileNo: {
        type: String,
    },
    guardianName: String,
    guardianMobileNo: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    address: {
        type: String
    },
    state: String,
    city: String,
    citySlug: String,
    pinCode: Number,
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
    trainerName: String,
    registrationDate: String,
    isActive: {
        type: Boolean,
        default: true
    }, //By default true means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default false means Not Deleted
});
student.plugin(timestamps);
module.exports = mongoose.model('students', student);