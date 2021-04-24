var timestamp = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var practice = mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: 'users'
    },
    topicId: {
        type: ObjectId,
        ref: 'topics'
    },
    subject: {
        type: ObjectId,
        ref: 'subjects'
    },
    chapters: [{ type: ObjectId, ref: 'chapters' }],
    units: [{ type: ObjectId, ref: 'units' }],
    chapter: { type: ObjectId, ref: 'chapters' },
    unit: { type: ObjectId, ref: 'units' },
    levelId: Number,
    startTime: Number,
    endTime: {
        type: Number,
        default: 0
    },
    status: { type: String, default: "progress" }, // progress | completed
    questions: [{
        qId: String,
        sentTime: Number,
        receivedTime: {
            type: Number,
            default: 0
        },
        questionId: {
            type: ObjectId,
            ref: 'questions'
        },
        level: {
            type: Number,
            default: 0
        },
        date: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            default: "unknown"
        }, //unknown,skipped,correct,incorrect

        optionIds: [],
        isCorrect: {
            type: Boolean,
            default: false
        }
    }],
    summary: {
        totalQuestion: {
            type: Number,
            default: 0
        },
        correctCount: {
            type: Number,
            default: 0
        },
        incorrectCount: {
            type: Number,
            default: 0
        },
        skipCount: {
            type: Number,
            default: 0
        },
        accuracy: {
            type: Number,
            default: 0
        },
        skillEarned: {
            type: Number,
            default: 0
        },
        result: {
            type: String,
            default: ''
        },
        timeSpent: {
            type: Number,
            default: 0
        },
    },
});
practice.plugin(timestamp);
module.exports = mongoose.model('practices', practice);

// A.find({b : {
//     $in: arr.map(function(o){ return mongoose.Types.ObjectId(o); })
//   }}, callback);