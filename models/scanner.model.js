var timestamp = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var scanners = mongoose.Schema({
    subject: {
        type: ObjectId,
        ref: 'subjects',
        required: true
    },
    //  ENTITY_TYPE_VIDEO, ENTITY_TYPE_SAMPLE_PAPER, ENTITY_TYPE_BOOK, ENTITY_TYPE_TEST, ENTITY_TYPE_PRACTICE
    entityType: {
        type: String,
        required: [true, "entity type is required"]
    },
    scannerCode: {
        type: String,
        required: true,
        unique: true
    },
    entityId: {
        type: ObjectId,
        required: [true, "entity id is required"],
        unique: true
    },
    entityIdPlain: {
        type: String,
        required: [true, "entity id is required"]
    },
    video: {
        type: ObjectId,
        ref: 'videos',
    },
    resource: {
        type: ObjectId,
        ref: 'resources',
    },
    test: {
        type: ObjectId,
        ref: 'tests',
    },
    topic: {
        type: ObjectId,
        ref: 'practiceSummery',
    },
    title: {
        type: String,
        require: true
    },
    description: {
        type: String
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
scanners.plugin(timestamp);
module.exports = mongoose.model('scanners', scanners);