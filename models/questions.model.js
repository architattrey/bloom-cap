var timestamp = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var questions = mongoose.Schema({
    subSegments: [{
        subSegmentId: {
            type: ObjectId,
            required: true,
            ref: 'subSegments'
        },
        difficultyLevel: Number
    }],
    segments: [{
        type: ObjectId,
        ref: 'segments'
    }],
    questionMatrix: {
        headings: [{ headValue: String }],
        rows: Number,
        cols: Number,
        body: [{
            colValues:
                [{ colValue: String }]
        }]
    },
    optionMatrix: {
        headings: [{ headValue: String }],
        rows: Number,
        cols: Number,
        body: [{
            rowNumber: Number,
            // isCorrect: Boolean,
            colValues:
                [{ colValue: String }]
        }]
    },
    topics: [{
        type: ObjectId,
        ref: 'topics'
    }],
    units: [{
        type: ObjectId,
        ref: 'units'
    }],
    subject: {
        type: ObjectId,
        ref: 'subjects'
    },
    chapters: [{
        type: ObjectId,
        ref: 'chapters'
    }],
    questionType: {
        type: String,
        required: true
    },
    questionsText: {
        type: String,
        require: true
    },
    questionImage: [{
        imageUrl: String,
        caption: String
    }],
    questionHint: String,
    numberOfOptions: Number,
    answer: [{
        optionId: Number,
        mappedTo: String
    }],
    solution: {
        solutionImages: [
            {
                solutionImageUrl: String,
                caption: String
            }],
        solutionText: String
    },
    options: [{
        optionText: {
            type: String,
            require: true
        },
        isImage: Boolean,
        optionImageUrl: String,
        optionId: Number
    }],
    tags: [String],
    createdById: {
        type: ObjectId,
        ref: 'users'
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
        type: ObjectId
    }],
});
questions.plugin(timestamp);
module.exports = mongoose.model('questions', questions);