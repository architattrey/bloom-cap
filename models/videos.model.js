var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var videos = mongoose.Schema({
    segments: [{
        type: ObjectId,
        ref: 'segments'
    }],
    subSegments: [{
        type: ObjectId,
        ref: 'segments'
    }],
    topics: [{
        type: ObjectId,
        ref: 'topics',
        required: true
    }],
    chapters: [{
        type: ObjectId,
        ref: 'chapters'
    }],
    units: [{
        type: ObjectId,
        ref: 'units'
    }],
    subject: {
        type: ObjectId,
        ref: 'subjects',
        required: true
    },
    //  VIDEO_TYPE_HOSTED, VIDEO_TYPE_YOUTUBE, VIDEO_TYPE_VIMEO
    videoType: {
        type: String,
        required: true
    },
    title: {
        type: String,
        require: true
    },
    description: {
        type: String
    },
    duration: {
        hours: Number,
        minutes: Number,
        seconds: Number
    },
    durationToDisplay: String,
    thumbUrl: {
        type: String,
        require: true
    },
    videoUrl: {
        type: String,
        require: true
    },
    tags: [String],
    createdById: {
        type: ObjectId,
        ref: 'users',
        default: null
    },
    updatedById: {
        type: ObjectId,
        ref: 'users',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    timestamp: Number,
    userIds: [{
        type: ObjectId,
        ref: 'users',
    }]
});
videos.plugin(timestamps);
module.exports = mongoose.model('videos', videos);