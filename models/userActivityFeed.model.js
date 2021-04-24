var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var userActivity = mongoose.Schema({
    userId: {
        type: ObjectId
    },
    activity: [{
        topicId: {
            type: ObjectId
        },
        summary: {
            NumberOfQuestionAttempted: {
                type: Number,
                default: 0
            },
            numbeOfCorrctAnswer: {
                type: Number,
                default: 0
            },
            numberOfSkip: {
                type: Number,
                default: 0
            },
            proficiency: {
                type: Number,
                default: 0
            },
            timeSpend: {
                type: Number,
                default: 0
            },
        },
        practices: [{
            levelId: Number,
            practiceId: String,
            startTime: Number,
            endTime: {
                type: Number,
                default: 0
            },
            questions: [{
                activityId: String,
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


            }]
        }],
    }]
});
userActivity.plugin(timestamps);
module.exports = mongoose.model('UserActivity', userActivity);

// A.find({b : {
//     $in: arr.map(function(o){ return mongoose.Types.ObjectId(o); })
//   }}, callback);