var timestamp = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var resources = mongoose.Schema({
    segments: [{
        type: ObjectId,
        ref: 'segments'
    }],
    subSegments: [{
        type: ObjectId,
        ref: 'subSegments'
    }],
    subject: {
        type: ObjectId,
        ref: 'subjects',
        required: true
    },
    //  RESOURCE_TYPE_SAMPLE_PAPER, RESOURCE_TYPE_BOOK, RESOURCE_TYPE_OTHER, RESOURCE_TYPE_EXAM_ASSISTANT
    resourceType: {
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
    thumbUrl: {
        type: String,
        require: true
    },
    resourceUrl: {
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
    timestamp: Number
});
resources.plugin(timestamp);
module.exports = mongoose.model('resources', resources);