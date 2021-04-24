var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var topics = mongoose.Schema({
    name: { type: String },
    chapters: [{ type: ObjectId, ref: 'chapters' }],
    units: [{ type: ObjectId, ref: 'units' }],
    subjects: [{
        type: ObjectId,
        ref: 'subjects'
    }],
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
    bannerUrl: {
        type: String,
        default: ''
    },
    timestamp: Number,
    createdBy: { type: String },
    updatedBy: { type: String, default: '' },
    isActive: { type: Boolean, default: false },//By default true means Active
    isDeleted: { type: Boolean, default: false }//By default false means Not Deleted
});
topics.plugin(timestamps);
module.exports = mongoose.model('topics', topics);