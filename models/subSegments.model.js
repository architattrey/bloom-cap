var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var subSegments = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    iconUrl: String,
    bannerUrl: String,
    segments: [{
        type: ObjectId,
        ref: 'segments'
    }, {
        required: true
    }],
    timestamp: {
        type: Number
    },
    createdById: {
        type: ObjectId,
        ref: 'staffs'
    },
    updatedById: {
        type: ObjectId,
        ref: 'staffs'
    },
    isSchool: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: false
    }, //By default false means inActive
    isDeleted: {
        type: Boolean,
        default: false
    } //By default false means Not Deleted
});
subSegments.plugin(timestamps);
subSegments.index({
    "segments": "text"
});
module.exports = mongoose.model('subSegments', subSegments);