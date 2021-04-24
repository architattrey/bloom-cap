var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var subjects = mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true
    },
    createdBy: {
        type: ObjectId,
        ref: 'staffs',
    },
    updatedBy: {
        type: ObjectId,
        ref: 'staffs',
    },
    iconUrl: {
        type: String,
        default: ""
    },
    bannerUrl: {
        type: String,
        default: ""
    },
    segments: [{
        type: ObjectId,
        ref: 'segments'
    }],
    subSegments: [{
        type: ObjectId,
        ref: 'subSegments'
    }],
    timestamp: {
        type: Number
    },
    isActive: {
        type: Boolean,
        default: false
    }, //By default 1 means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default 1 means Not Deleted
});
subjects.plugin(timestamps);
module.exports = mongoose.model('subjects', subjects);