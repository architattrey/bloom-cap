var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

function toLower(val) {
    if (typeof val !== 'string') val = '';
    return name.toLowerCase();
}

var school = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'School name is required']
    },
    nameInternal: {
        type: String,
        // set: toLower,
        lowercase: true,
        required: [true, 'School name is required']
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    iconUrl: {
        type: String,
        default: ""
    },
    bannerUrl: {
        type: String,
        default: ""
    },
    schoolId: {
        type: String,
        default: ''
    },
    timestamp: Number,
    createdById: {
        type: ObjectId,
        ref: 'staffs'
    },
    isActive: {
        type: Boolean,
        default: true
    }, //By default 1 means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default 0 means Not Deleted
});
school.plugin(timestamps);
module.exports = mongoose.model('schools', school);