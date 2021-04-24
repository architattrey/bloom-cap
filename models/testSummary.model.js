var timestamp = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var summary = mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: 'users'
    },
    testId: {
        type: ObjectId,
        ref: 'tests'
    },
    subjectId: {
        type: ObjectId,
        ref: 'subjects'
    },
    testReferenceId: {
        type: String
    },
    testStatus: {
        type: String,
        default: "progress" // completed, cancelled
    },
    startTime: Number,
    endTime: {
        type: Number,
        default: 0
    },
    questions: [{
        questionId: {
            type: ObjectId,
            ref: 'questions'
        },
        level: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            default: "unknown"
        }, //unknown,skipped,correct,incorrect

        selectedOptions: [],
        answer: [{
            optionId: Number,
            mappedTo: String
        }],
        questionType: {
            type: String,
            require: true
        },
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
        proficiency: {
            type: Number,
            default: 0
        },
        accuracy: {
            type: Number,
            default: 0
        },
        result: {
            type: String,
            default: 'Not Evaluated'
        },
        score: {
            type: Number,
            default: 0
        },
        timeSpent: {
            type: Number,
            default: 0
        },
        skillEarned: {
            type: Number,
            default: 0
        },
        description: {
            type: String,
            default: ''
        },
        bannerUrl: {
            type: String,
            default: ''
        },
        bannerLink: {
            type: String,
            default: ''
        },
    },
});
summary.plugin(timestamp);
module.exports = mongoose.model('testSummary', summary);

// A.find({b : {
//     $in: arr.map(function(o){ return mongoose.Types.ObjectId(o); })
//   }}, callback);