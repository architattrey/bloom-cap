var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var units = mongoose.Schema({
    segments: [{
        type: ObjectId,
        ref: 'segments'
    }],
    subSegments: [{
        type: ObjectId,
        ref: 'subSegments'
    }],
    iconUrl: {
        type: String,
        default: ''
    },
    weightage:Number,
    bannerUrl: {
        type: String,
        default: ''
    },
    timestamp: Number,
    subject: {
        type: ObjectId,
        ref: 'subjects'
    },
    name: {
        type: String
    },
    score: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: ObjectId,
        ref: 'users'
    },
    updatedBy: {
        type: ObjectId,
        ref: 'staffs'
    },
    isActive: {
        type: Boolean,
        default: false
    }, //By default true means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default false means Not Deleted
});
units.plugin(timestamps);
module.exports = mongoose.model('units', units);