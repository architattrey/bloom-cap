var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var tests = mongoose.Schema({
    timestamp: {
        type: Number
    },
    duration: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    testName: String,
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    instructions: String,
    resultRules: [{
        lowerLimit: Number,
        upperLimit: Number,
        message: String,
        imageUrl: String,
        linkUrl: String
    }],
    passingCutOff: Number,
    segments: [{
        type: ObjectId,
        ref: 'segments',
        required: true
    }],
    subSegments: [{
        type: ObjectId,
        ref: 'subSegments',
        required: true
    }],
    subject: {
        type: ObjectId,
        ref: 'subjects',
        required: true
    },
    unitDistribution: [{
        unitId: {
            type: ObjectId,
            ref: 'units',
            required: true
        },
        questionDistribution: [{
            questionType: String,
            level: [{
                difficultyLevel: Number,
                noOfQuestions: Number
            }],
        }]
    }],
    marks: [{
        difficultyLevel: Number,
        marks: Number
    }],
    createdById: {
        type: String,
        ref: 'users'
    },
    updatedById: {
        type: String,
        ref: 'users'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    users: [{ user: { type: ObjectId, ref: "users" } }]
});
tests.plugin(timestamps);
module.exports = mongoose.model('tests', tests);