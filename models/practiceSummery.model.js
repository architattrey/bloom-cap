var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var summary = mongoose.Schema({
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
    chapter: {
        type: ObjectId,
        ref: 'chapters'
    },
    unit: {
        type: ObjectId,
        ref: 'units'
    },
    topic: {
        type: ObjectId,
        ref: 'topics'
    },
    summaryType: {
        type: String,
        default: 'topic'
    },
    summary: {
        // NumberOfQuestionAttempted: {
        //     type: Number,
        //     default: 0
        // },
        // numbeOfCorrctAnswer: {
        //     type: Number,
        //     default: 0
        // },
        // numberOfSkip: {
        //     type: Number,
        //     default: 0
        // },
        proficiency: {
            type: Number,
            default: 0
        },
        score: {
            type: String,
            default: "0/0"
        },
        progress: {
            type: Number,
            default: 0
        },
        accuracy: {
            type: Number,
            default: 0
        },
        description: {
            type: String,
            default: ''
        },
        timeSpent: {
            type: Number,
            default: 0
        },

        totalQuestion: {
            type: Number,
            default: 0
        },
        attemptedQuestionCount: {
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

    },
});
summary.plugin(timestamps);
module.exports = mongoose.model('summaries', summary);

// A.find({b : {
//     $in: arr.map(function(o){ return mongoose.Types.ObjectId(o); })
//   }}, callback);