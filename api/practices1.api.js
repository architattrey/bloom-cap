var Q = require('q');
var request = require('request');
var C = require('./../constant');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var J = require('./../share/comman.methods');
var ObjectId = Mongoose.Schema.Types.ObjectId;
var User = require('./../models/users.model');
var Topic = require('./../models/topics.model');
var Chapter = require('./../models/chapters.model');
var Unit = require('./../models/units.model');
var Question = require('./../models/questions.model');
var Practice = require('./../models/practice.model');
var Summary = require('./../models/practiceSummery.model');
var _ = require('underscore')._;


module.exports = function (app) {

    /**
     * @api {post} /api/topics/:id/levels/:levelId/practices Start practice
     * @apiName Start practice
     * @apiDescription Start practice  When you start practice then you get an practiceId in message key. you have to pass it every time till start to end practice.
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} topicId . In URL sample value : - 59f7086ac1e0ed16f8f4d382     
     * @apiParam {string} levelId . In URL sample value :- 2
     */

    app.post('/api/topics/:id/levels/:levelId/practices', function (req, res) {
        var out;
        var practiceId = U.generateRandomToken();
        var b = req.body;
        var topicDetail = {};
        b.topicId = req.params.id;
        b.levelId = parseInt(req.params.levelId);
        b.userId = req.headers.userid;
        var qId = U.getUid();
        console.log("data from input", b);
        var validateTopicId = function () {
            var defer = Q.defer();
            Topic.find({
                _id: b.topicId
            }, function (err, topic) {
                if (!err) {
                    if (!topic || topic.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'topic not exist', b);
                        defer.reject(out);
                    } else {
                        topicDetail = topic[0];
                        defer.resolve();
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var savePracticeActivity = function () {
            var defer = Q.defer();
            var activityUser = new Practice();
            activityUser.userId = b.userId;
            activityUser.topicId = b.topicId;
            activityUser.subject = topicDetail.subjects[0];
            activityUser.units = topicDetail.units;
            activityUser.chapters = topicDetail.chapters;
            activityUser.unit = topicDetail.units[0];
            activityUser.chapter = topicDetail.chapters[0];
            activityUser.levelId = b.levelId;
            activityUser.startTime = U.getTimeStamp();
            activityUser.questions = [{
                qId: qId,
                sentTime: U.getTimeStamp(),
                questionId: b.questionId,
                level: b.levelId,
                date: U.getTimeStamp(),
            }]
            activityUser.save(function (err, data) {
                if (!err) {
                    if (data != null) {
                        b.practiceId = data._id;
                        defer.resolve();
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Error in practices', b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        J.verifyUser(b.userId)
            .then(function (user) {
                b.segmentId = user.segment;
                b.subSegmentId = user.subSegment;
                return validateTopicId();
            })
            .then(function () {
                return getQuestion(b.userId, b.levelId, b.topicId, b.segmentId, b.subSegmentId);
            })
            .then(function (question) {
                if (question != null && question.length > 0) {
                    b.questionId = question[0]._id;
                    b.question = question;
                    b.question[0].qId = qId;
                    return J.updateQuestion(question, b.userId);
                } else {
                    var defer = Q.defer();
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No question found', b);
                    defer.reject(out);
                    return defer.promise;
                }
            })
            .then(function () {
                return savePracticeActivity();
            })
            .then(function () {
                out = U.getJson(C.STATUS_SUCCESS_CODE, b.practiceId, b.question);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    var getQuestion = function (userId, levelId, topicId, segmentId, subSegmentId) {
        console.log("Get question for :-", "userId :-", userId, " levelId :-", levelId, " topicId :-", topicId, "segmentId :-", segmentId, "segmentId :-", subSegmentId);
        var defer = Q.defer();
        Question.aggregate([{
            $match: {
                // "userIds": {
                //     $ne: Mongoose.Types.ObjectId(userId)
                // },
                "segments": Mongoose.Types.ObjectId(segmentId),
                "subSegments.subSegmentId": Mongoose.Types.ObjectId(subSegmentId),
                "subSegments.difficultyLevel": levelId,
                "topics": Mongoose.Types.ObjectId(topicId),
                "isActive": true,
                "isDeleted": false
            }
        },
        {
            $sample: { size: 1 }// Picks random document from collection
        },
        {
            $project: {
                _id: 1,
                numberOfOptions: 1,
                questionHint: 1,
                questionsText: 1,
                options: 1,
                referenceMedia: 1,
                questionImage: 1,
                questionType: 1,
                questionMatrix: 1,
                optionMatrix: 1
            }
        }
        ], function (err, question) {
            if (!err) {
                defer.resolve(question);
            } else {
                out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                defer.reject(out);
            }
        })
        return defer.promise;
    };

    /**
     * @api {put} /api/v2/users/practices/:practiceId/end End practice
     * @apiName End practice
     * @apiDescription End practice
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} practiceId . In url . (Id is practice id) sample value :- NTE2HY0U
     */

    app.put('/api/users/practices/:practiceId/end', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        b.correctCount = 0;
        b.incorrectCount = 0;
        b.skipCount = 0;
        var practiceDetail = {};
        var getPracticeDetails = function () {
            var defer = Q.defer();
            Practice.find({
                _id: Mongoose.Types.ObjectId(b.practiceId)
            }, {}, { lean: true }, function (err, practice) {
                if (!err) {
                    if (!practice || practice.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'seems practice not exist');
                        defer.reject(out);
                    } else {
                        practiceDetail = practice[0];
                        if (practiceDetail.status == "completed") {
                            out = U.getJson(200, 'This practice has been already ended'); // Redirect to result screen
                            defer.reject(out);
                        } else {
                            b.topicId = practice[0].topicId;
                            b.totalQuestion = practice[0].questions.length;
                            var question = practice[0].questions;
                            for (var i = 0; i < question.length; i++) {
                                if (question[i].status == 'incorrect')
                                    b.incorrectCount += 1;
                                if (question[i].status == 'correct')
                                    b.correctCount += 1;
                                if (question[i].status == 'skipped')
                                    b.skipCount += 1;
                                //  Reduce count by 1 if any question is pending with unknown status
                                if (question[i].status == 'unknown')
                                    b.totalQuestion -= 1;
                            }
                            if (practice[0].startTime > 0)
                                b.timespent = ((U.getTimeStamp() - practice[0].startTime) / (60 * 1000));
                            defer.resolve();
                        }
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var endPractice = function () {
            var defer = Q.defer();
            if (b.totalQuestion > 0 && (b.correctCount + b.incorrectCount) > 0) {
                //  Accuracy is measure of correct answer over total attempted question
                b.accuracy = (b.correctCount * 100 / (b.correctCount + b.incorrectCount));
                //  Skill will be earned based on total attempted question over total question
                b.skillEarned = ((b.correctCount + b.incorrectCount) * 100 / b.totalQuestion);
            }
            else {
                b.accuracy = 0;
                b.skillEarned = 0;
            }
            b.result = b.correctCount + '/' + b.totalQuestion;
            if (b.accuracy >= 80) {
                b.description = "Yay!! You did it .You were awesome";
            } else {
                b.description = "You need to do more practice";
            }


            //  Update practice level summary
            Practice.update({
                _id: b.practiceId
            }, {
                    '$set': {
                        endTime: U.getTimeStamp(),
                        status: "completed",
                        "summary.totalQuestion": b.totalQuestion,
                        "summary.correctCount": b.correctCount,
                        "summary.skipCount": b.skipCount,
                        "summary.description": b.description,
                        "summary.incorrectCount": b.incorrectCount,
                        "summary.accuracy": Math.round(b.accuracy),
                        "summary.skillEarned": Math.round(b.skillEarned),
                        "summary.result": b.result,
                        "summary.timeSpent": Math.ceil(b.timespent)
                    }
                }, {
                    upsert: true
                },
                function (err, activity) {
                    if (!err) {
                        defer.resolve();

                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        var getTopicSummary = function () {
            var defer = Q.defer()
            Practice.find({
                topicId: Mongoose.Types.ObjectId(b.topicId),
                userId: b.userId
            }, {
                    levelId: 1,
                    summary: 1
                }, { lean: true }, function (err, practices) {
                    if (!err) {
                        if (!practices || practices.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'seems no practice available for this user');
                            defer.reject(out);
                        } else {
                            var topicSummary = {};
                            topicSummary.attemptedQuestionCount = 0;
                            topicSummary.totalQuestion = 0;
                            topicSummary.correctCount = 0;
                            topicSummary.incorrectCount = 0;
                            topicSummary.accuracy = 0;
                            topicSummary.skipCount = 0;
                            topicSummary.timeSpent = 1;
                            topicSummary.progress = 0;

                            var skillEarned = 0;
                            var easyPracticeCount = 0;
                            var mediumPracticeCount = 0;
                            var hardPracticeCount = 0;
                            _.each(practices, function (p) {
                                topicSummary.attemptedQuestionCount += (p.summary.correctCount + p.summary.incorrectCount);
                                topicSummary.totalQuestion += p.summary.totalQuestion;
                                topicSummary.correctCount += p.summary.correctCount;
                                topicSummary.incorrectCount += p.summary.incorrectCount;
                                topicSummary.accuracy += p.summary.accuracy;
                                topicSummary.skipCount += p.summary.skipCount;
                                topicSummary.timeSpent += p.summary.timeSpent;
                                skillEarned += p.summary.skillEarned;
                                if (p.levelId == 1)
                                    easyPracticeCount += p.summary.correctCount;
                                else if (p.levelId == 2)
                                    mediumPracticeCount += p.summary.correctCount;
                                else if (p.levelId == 3)
                                    hardPracticeCount += p.summary.correctCount;
                            });

                            topicSummary.score = topicSummary.correctCount + "/" + topicSummary.totalQuestion;
                            //  Calculate average accuracy
                            topicSummary.accuracy = topicSummary.accuracy / practices.length;
                            //  Progress will be counted as 100 if user has performed practice at all level
                            var questionThreshold = 3;
                            if (process.env.NODE_ENV == "production")
                                questionThreshold = 7;

                            var easyProgress = Math.ceil(easyPracticeCount * (33 / questionThreshold));
                            var mediumProgress = Math.ceil(mediumPracticeCount * (33 / questionThreshold));
                            var hardProgress = Math.ceil(hardPracticeCount * (34 / questionThreshold));
                            topicSummary.proficiency = 0;
                            topicSummary.proficiency += easyProgress > 33 ? 33 : easyProgress;
                            topicSummary.proficiency += mediumProgress > 33 ? 33 : mediumProgress;
                            topicSummary.proficiency += hardProgress > 34 ? 34 : hardProgress;

                            if (topicSummary.accuracy >= 80) {
                                topicSummary.description = "<strong>Your performance in this topic is very good!!</strong>";
                            } else {
                                topicSummary.description = "<strong>Looks like you need to earn more skills in this topic</strong>";
                            }
                            //  Calculate average skills earned
                            skillEarned = skillEarned / practices.length;
                            //  Assuming 10 as base for number of practices which makes student perfect in that topic
                            // topicSummary.proficiency = ((skillEarned * practices.length * topicSummary.totalQuestion) / (10 * topicSummary.timeSpent * 2)) + topicSummary.progress / 2
                            //  Round proficiency to 100 if it crosses it
                            // topicSummary.proficiency = topicSummary.proficiency > 100 ? 100 : Math.round(topicSummary.proficiency);
                            //  30% of proficiency and 70% of accuracy
                            topicSummary.progress = Math.ceil((topicSummary.proficiency * 0.3) + (topicSummary.accuracy * 0.7));
                            defer.resolve(topicSummary);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }
        var updateTopicSummary = function (topicSummary) {
            var defer = Q.defer();
            Summary.update({
                userId: Mongoose.Types.ObjectId(b.userId),
                topicId: b.topicId
            }, {
                    $set: {
                        "summary": topicSummary,
                        "topicId": b.topicId,
                        "topic": b.topicId,
                        "chapter": practiceDetail.chapter,
                        "unit": practiceDetail.unit,
                        "userId": b.userId,
                        "subject": practiceDetail.subject,
                        "summaryType": "topic"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve();
                    } else {
                        defer.resolve();
                    }
                })
            return defer.promise;
        };

        //  Deprecated classic method
        var getTopicCountBySubject = function (subjectId) {
            var defer = Q.defer();
            var query = Topic.find({
                isDeleted: false,
                isActive: true
            });

            if (Mongoose.Types.ObjectId.isValid(subjectId))
                query.where("subjects").in([Mongoose.Types.ObjectId(subjectId)])
            else
                throw "Provided id is invalid";
            query.count().exec(function (err, topicCount) {
                if (!err) {
                    defer.resolve(topicCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getTopicCountByChapter = function (chapterId) {
            var defer = Q.defer();
            var query = Topic.find({
                isDeleted: false,
                isActive: true
            });

            if (Mongoose.Types.ObjectId.isValid(chapterId))
                query.where("chapters").in([Mongoose.Types.ObjectId(chapterId)]);
            else
                throw "Provided id is invalid";
            query.count().exec(function (err, topicCount) {
                if (!err) {
                    defer.resolve(topicCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getChapterCountByUnit = function (unitId) {
            var defer = Q.defer();
            var query = Chapter.find({
                isDeleted: false,
                isActive: true
            });

            if (Mongoose.Types.ObjectId.isValid(unitId))
                query.where("units").in([Mongoose.Types.ObjectId(unitId)]);
            else
                throw "Provided id is invalid";
            query.count().exec(function (err, chapterCount) {
                if (!err) {
                    defer.resolve(chapterCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getUnitsBySubject = function (subjectId) {
            var defer = Q.defer();
            var query = Unit.find({
                isDeleted: false,
                isActive: true
            });

            if (Mongoose.Types.ObjectId.isValid(subjectId))
                query.where("subject").equals(Mongoose.Types.ObjectId(subjectId));
            else
                throw "Provided id is invalid";
            query.exec(function (err, units) {
                if (!err) {
                    defer.resolve(units);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        //  Deprecated classic method
        var getSubjectSummary1 = function (topicCount) {
            var defer = Q.defer()
            Summary.find({
                subject: practiceDetail.subject,
                userId: b.userId,
                "summaryType": "topic"
            }, {
                    summary: 1
                }, { lean: true }, function (err, practices) {
                    if (!err) {
                        var summary = {};
                        summary.attemptedQuestionCount = 0;
                        summary.totalQuestion = 0;
                        summary.correctCount = 0;
                        summary.incorrectCount = 0;
                        summary.accuracy = 0;
                        summary.skipCount = 0;
                        summary.timeSpent = 0;
                        summary.progress = 0;
                        summary.proficiency = 0;

                        var skillEarned = 0;
                        _.each(practices, function (p) {
                            summary.attemptedQuestionCount += (p.summary.correctCount + p.summary.incorrectCount);
                            summary.totalQuestion += p.summary.totalQuestion;
                            summary.correctCount += p.summary.correctCount;
                            summary.incorrectCount += p.summary.incorrectCount;
                            summary.skipCount += p.summary.skipCount;
                            summary.accuracy += p.summary.accuracy;
                            summary.timeSpent += p.summary.timeSpent;
                            summary.proficiency += p.summary.proficiency;
                            summary.progress += p.summary.progress;
                        })

                        //  Calculate average of progress against all topic of this subject
                        if (topicCount && topicCount > 0) {
                            summary.progress = Math.ceil(summary.progress / topicCount);
                        } else summary.progress = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / practices.length;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        summary.proficiency = Math.ceil(summary.proficiency / practices.length);
                        console.log("Old summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        var getUnitSummaryBySubject = function (subjectId) {
            var defer = Q.defer()
            // console.log("practice detail : %j", practiceDetail);
            Summary.aggregate([{
                $match: {
                    $and: [
                        { "subject": subjectId },
                        { "summaryType": "unit" },
                        { "userId": Mongoose.Types.ObjectId(b.userId) }
                    ]
                },
            }, {
                $lookup: {
                    from: "units",
                    localField: "unit",
                    foreignField: "_id",
                    as: "unitDetail"
                }
            }, {
                $project: {
                    summaryType: 1,
                    unitId: "$unit",
                    userId: 1,
                    summary: 1,
                    subject: 1,
                    unit: { $arrayElemAt: ["$unitDetail", 0] }
                }
            }, {
                $project: {
                    summaryType: 1,
                    unitId: "$unitId",
                    userId: 1,
                    summary: 1,
                    subject: 1,
                    weightage: "$unit.weightage"
                }
            }
                , {
                $group: {
                    _id: "$summaryType",
                    totalQuestion: { "$sum": "$summary.totalQuestion" },
                    correctCount: { "$sum": "$summary.correctCount" },
                    incorrectCount: { "$sum": "$summary.incorrectCount" },
                    accuracy: { "$sum": "$summary.accuracy" },
                    skipCount: { "$sum": "$summary.skipCount" },
                    timeSpent: { "$sum": "$summary.timeSpent" },
                    progress: { "$sum": "$progress" },
                    numberOfPractices: { "$sum": 1 },
                    proficiency: { $sum: { $divide: [{ $multiply: ["$summary.proficiency", "$unit.weightage"] }, 100] } }
                }
            }, {
                $project: {
                    totalQuestion: 1,
                    correctCount: 1,
                    incorrectCount: 1,
                    accuracy: 1,
                    skipCount: 1,
                    timeSpent: 1,
                    proficiency: { $ceil: "$proficiency" },
                    progress: { $ceil: "$progress" },
                    numberOfPractices: 1

                }
            }
            ], function (err, data) {
                if (!err) {
                    if (data != null && data.length > 0) {
                        var summary = data[0];
                        summary.attemptedQuestionCount = summary.correctCount + summary.incorrectCount;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / summary.numberOfPractices;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        // summary.proficiency = Math.ceil(summary.proficiency / summary.numberOfPractices);
                        summary.progress = Math.ceil((summary.proficiency * 0.3) + (summary.accuracy * 0.7));
                        // summary.progress = Math.ceil(summary.progress / topicCount);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No unit level summary found for this subject", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateSubjectSummary = function (summary) {
            var defer = Q.defer();
            Summary.update({
                subject: practiceDetail.subject,
                userId: Mongoose.Types.ObjectId(b.userId),
                "summaryType": "subject"
            }, {
                    $set: {
                        "summary": summary,
                        "subject": practiceDetail.subject,
                        "userId": b.userId,
                        "summaryType": "subject"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve();
                    } else {
                        defer.resolve();
                    }
                })
            return defer.promise;
        };
        var getChapterSummary = function (topicCount) {
            var defer = Q.defer();

            Summary.aggregate([{
                $match: {
                    $and: [
                        { "chapter": practiceDetail.chapter },
                        { "summaryType": "topic" },
                        { "userId": Mongoose.Types.ObjectId(b.userId) }
                    ]
                }
            },
            {
                $group: {
                    _id: "$summaryType",
                    totalQuestion: { "$sum": "$summary.totalQuestion" },
                    correctCount: { "$sum": "$summary.correctCount" },
                    incorrectCount: { "$sum": "$summary.incorrectCount" },
                    accuracy: { "$sum": "$summary.accuracy" },
                    skipCount: { "$sum": "$summary.skipCount" },
                    timeSpent: { "$sum": "$summary.timeSpent" },
                    proficiency: { "$sum": "$summary.proficiency" },
                    progress: { "$sum": "$summary.progress" },
                    numberOfPractices: { "$sum": 1 },
                }
            }
            ], function (err, data) {
                if (!err) {
                    if (data != null && data.length > 0) {
                        var summary = data[0];
                        summary.attemptedQuestionCount = summary.correctCount + summary.incorrectCount;
                        //  Calculate average of progress against all topic of this subject
                        if (topicCount && topicCount > 0) {
                            summary.proficiency = Math.ceil(summary.proficiency / topicCount);
                        } else summary.proficiency = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / summary.numberOfPractices;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        // summary.proficiency = Math.ceil(summary.proficiency / summary.numberOfPractices);
                        summary.progress = Math.ceil((summary.proficiency * 0.3) + (summary.accuracy * 0.7));
                        // console.log("New summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No topic level summary found for this chapter", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateChapterSummary = function (summary) {
            var defer = Q.defer();
            Summary.update({
                chapter: practiceDetail.chapter,
                userId: Mongoose.Types.ObjectId(b.userId),
                "summaryType": "chapter"
            }, {
                    $set: {
                        "summary": summary,
                        "subject": practiceDetail.subject,
                        "userId": b.userId,
                        "subject": practiceDetail.subject,
                        "unit": practiceDetail.unit,
                        "summaryType": "chapter"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve();
                    } else {
                        defer.resolve();
                    }
                })
            return defer.promise;
        };
        var getUnitSummary = function (chapterCount) {
            var defer = Q.defer()

            Summary.aggregate([{
                $match: {
                    $and: [
                        { "unit": practiceDetail.unit },
                        { "summaryType": "chapter" },
                        { "userId": Mongoose.Types.ObjectId(b.userId) }
                    ]
                }
            },
            {
                $group: {
                    _id: "$summaryType",
                    totalQuestion: { "$sum": "$summary.totalQuestion" },
                    correctCount: { "$sum": "$summary.correctCount" },
                    incorrectCount: { "$sum": "$summary.incorrectCount" },
                    accuracy: { "$sum": "$summary.accuracy" },
                    skipCount: { "$sum": "$summary.skipCount" },
                    timeSpent: { "$sum": "$summary.timeSpent" },
                    proficiency: { "$sum": "$summary.proficiency" },
                    progress: { "$sum": "$summary.progress" },
                    numberOfPractices: { "$sum": 1 },
                }
            }
            ], function (err, data) {
                if (!err) {
                    if (data != null && data.length > 0) {
                        var summary = data[0];
                        summary.attemptedQuestionCount = summary.correctCount + summary.incorrectCount;
                        //  Calculate average of progress against all topic of this subject
                        if (chapterCount && chapterCount > 0) {
                            summary.proficiency = Math.ceil(summary.proficiency / chapterCount);
                        } else summary.proficiency = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / summary.numberOfPractices;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        // summary.proficiency = Math.ceil(summary.proficiency / summary.numberOfPractices);
                        summary.progress = Math.ceil((summary.proficiency * 0.3) + (summary.accuracy * 0.7));
                        // console.log("New summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No topic level summary found for this chapter", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateUnitSummary = function (summary) {
            var defer = Q.defer();
            Summary.update({
                unit: practiceDetail.unit,
                userId: Mongoose.Types.ObjectId(b.userId),
                "summaryType": "unit"
            }, {
                    $set: {
                        "summary": summary,
                        "subject": practiceDetail.subject,
                        "userId": b.userId,
                        "unit": practiceDetail.unit,
                        "summaryType": "unit"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve(summary);
                    } else {
                        defer.resolve(summary);
                    }
                })
            return defer.promise;
        };
        getPracticeDetails()
            .then(function () {
                return endPractice();
            })
            .then(function () {
                return getTopicSummary();
            })
            .then(function (topicSummary) {
                return updateTopicSummary(topicSummary);
            })
            .then(function () {
                return getTopicCountByChapter(practiceDetail.chapter);
            })
            .then(function (topicCount) {
                b.topicCount = topicCount;
                return getChapterCountByUnit(practiceDetail.unit);
            })
            .then(function (chapterCount) {
                b.chapterCount = chapterCount;
                return getUnitsBySubject(practiceDetail.subject);
            })
            .then(function (units) {
                b.units = units;
                // return getSubjectSummary(topicCount);
                return getChapterSummary(b.topicCount);
            })
            // .then(function (summary) {
            //     return updateSubjectSummary(summary);
            // })
            // .then(function () {
            //     return getChapterSummary(b.topicCount);
            // })
            .then(function (summary) {
                return updateChapterSummary(summary);
            })
            .then(function () {
                return getUnitSummary(b.chapterCount);
            })
            .then(function (summary) {
                return updateUnitSummary(summary);
            })
            .then(function () {
                return getUnitSummaryBySubject(practiceDetail.subject);
            })
            .then(function (summary) {
                return updateSubjectSummary(summary);
            })
            .then(function (summary) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    app.put('/api/v1/users/practices/:practiceId/end', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        b.correctCount = 0;
        b.incorrectCount = 0;
        b.skipCount = 0;
        var practiceDetail = {};
        var getPracticeDetails = function () {
            var defer = Q.defer()
            Practice.find({
                _id: Mongoose.Types.ObjectId(b.practiceId)
            }, {}, { lean: true }, function (err, practice) {
                if (!err) {
                    if (!practice || practice.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'seems practice not exist');
                        defer.reject(out);
                    } else {
                        practiceDetail = practice[0];
                        if (practiceDetail.status == "completed") {
                            out = U.getJson(200, 'This practice has been already ended'); // Redirect to result screen
                            defer.reject(out);
                        } else {
                            b.topicId = practice[0].topicId;
                            b.totalQuestion = practice[0].questions.length;
                            var question = practice[0].questions;
                            for (var i = 0; i < question.length; i++) {
                                if (question[i].status == 'incorrect')
                                    b.incorrectCount += 1;
                                if (question[i].status == 'correct')
                                    b.correctCount += 1;
                                if (question[i].status == 'skipped')
                                    b.skipCount += 1;
                                //  Reduce count by 1 if any question is pending with unknown status
                                if (question[i].status == 'unknown')
                                    b.totalQuestion -= 1;
                            }
                            if (practice[0].startTime > 0)
                                b.timespent = ((U.getTimeStamp() - practice[0].startTime) / (60 * 1000));
                            defer.resolve();
                        }
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var endPractice = function () {
            var defer = Q.defer();
            if (b.totalQuestion > 0 && (b.correctCount + b.incorrectCount) > 0) {
                //  Accuracy is measure of correct answer over total attempted question
                b.accuracy = (b.correctCount * 100 / (b.correctCount + b.incorrectCount));
                //  Skill will be earned based on total attempted question over total question
                b.skillEarned = ((b.correctCount + b.incorrectCount) * 100 / b.totalQuestion);
            }
            else {
                b.accuracy = 0;
                b.skillEarned = 0;
            }
            b.result = b.correctCount + '/' + b.totalQuestion;
            if (b.accuracy >= 80) {
                b.description = "Yay!! You did it .You were awesome";
            } else {
                b.description = "You need to do more practice";
            }


            //  Update practice level summary
            Practice.update({
                _id: b.practiceId
            }, {
                    '$set': {
                        endTime: U.getTimeStamp(),
                        status: "completed",
                        "summary.totalQuestion": b.totalQuestion,
                        "summary.correctCount": b.correctCount,
                        "summary.skipCount": b.skipCount,
                        "summary.description": b.description,
                        "summary.incorrectCount": b.incorrectCount,
                        "summary.accuracy": Math.round(b.accuracy),
                        "summary.skillEarned": Math.round(b.skillEarned),
                        "summary.result": b.result,
                        "summary.timeSpent": Math.ceil(b.timespent)
                    }
                }, {
                    upsert: true
                },
                function (err, activity) {
                    if (!err) {
                        defer.resolve();

                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        var getTopicSummary = function () {
            var defer = Q.defer()
            Practice.find({
                topicId: Mongoose.Types.ObjectId(b.topicId),
                userId: b.userId
            }, {
                    levelId: 1,
                    summary: 1
                }, { lean: true }, function (err, practices) {
                    if (!err) {
                        if (!practices || practices.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'seems no practice available for this user');
                            defer.reject(out);
                        } else {
                            var topicSummary = {};
                            topicSummary.attemptedQuestionCount = 0;
                            topicSummary.totalQuestion = 0;
                            topicSummary.correctCount = 0;
                            topicSummary.incorrectCount = 0;
                            topicSummary.accuracy = 0;
                            topicSummary.skipCount = 0;
                            topicSummary.timeSpent = 1;
                            topicSummary.progress = 0;

                            var skillEarned = 0;
                            var easyPracticeCount = 0;
                            var mediumPracticeCount = 0;
                            var hardPracticeCount = 0;
                            _.each(practices, function (p) {
                                topicSummary.attemptedQuestionCount += (p.summary.correctCount + p.summary.incorrectCount);
                                topicSummary.totalQuestion += p.summary.totalQuestion;
                                topicSummary.correctCount += p.summary.correctCount;
                                topicSummary.incorrectCount += p.summary.incorrectCount;
                                topicSummary.accuracy += p.summary.accuracy;
                                topicSummary.skipCount += p.summary.skipCount;
                                topicSummary.timeSpent += p.summary.timeSpent;
                                skillEarned += p.summary.skillEarned;
                                if (p.levelId == 1)
                                    easyPracticeCount++;
                                else if (p.levelId == 2)
                                    mediumPracticeCount++;
                                else if (p.levelId == 3)
                                    hardPracticeCount++;
                            })

                            topicSummary.score = topicSummary.correctCount + "/" + topicSummary.totalQuestion;
                            //  Calculate average accuracy
                            topicSummary.accuracy = topicSummary.accuracy / practices.length;
                            //  Progress will be counted as 100 if user has performed practice at all level
                            if (easyPracticeCount > 0)
                                topicSummary.progress += 33;
                            if (mediumPracticeCount > 0)
                                topicSummary.progress += 33;
                            if (hardPracticeCount > 0)
                                topicSummary.progress += 34;

                            if (topicSummary.accuracy >= 80) {
                                topicSummary.description = "<strong>Your performance in this topic is very good!!</strong>";
                            } else {
                                topicSummary.description = "<strong>Looks like you need to earn more skills in this topic</strong>";
                            }
                            //  Calculate average skills earned
                            skillEarned = skillEarned / practices.length;
                            //  Assuming 10 as base for number of practices which makes student perfect in that topic
                            topicSummary.proficiency = ((skillEarned * practices.length * topicSummary.totalQuestion) / (10 * topicSummary.timeSpent * 2)) + topicSummary.progress / 2
                            //  Round proficiency to 100 if it crosses it
                            topicSummary.proficiency = topicSummary.proficiency > 100 ? 100 : Math.round(topicSummary.proficiency);
                            defer.resolve(topicSummary);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }
        var updateTopicSummary = function (topicSummary) {
            var defer = Q.defer();
            Summary.update({
                userId: Mongoose.Types.ObjectId(b.userId),
                topicId: b.topicId
            }, {
                    $set: {
                        "summary": topicSummary,
                        "topicId": b.topicId,
                        "topic": b.topicId,
                        "chapter": practiceDetail.chapter,
                        "unit": practiceDetail.unit,
                        "userId": b.userId,
                        "subject": practiceDetail.subject,
                        "summaryType": "topic"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve();
                    } else {
                        defer.resolve();
                    }
                })
            return defer.promise;
        };

        var getTopicCountBySubject = function (subjectId) {
            var defer = Q.defer();
            var query = Topic.find({
                isDeleted: false
            });

            if (Mongoose.Types.ObjectId.isValid(subjectId))
                query.where("subjects").in([Mongoose.Types.ObjectId(subjectId)])
            else
                throw "Provided id is invalid";
            query.count().exec(function (err, topicCount) {
                if (!err) {
                    defer.resolve(topicCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        //  Deprecated classic method
        var getSubjectSummary1 = function (topicCount) {
            var defer = Q.defer()
            Summary.find({
                subject: practiceDetail.subject,
                userId: b.userId,
                "summaryType": "topic"
            }, {
                    summary: 1
                }, { lean: true }, function (err, practices) {
                    if (!err) {
                        var summary = {};
                        summary.attemptedQuestionCount = 0;
                        summary.totalQuestion = 0;
                        summary.correctCount = 0;
                        summary.incorrectCount = 0;
                        summary.accuracy = 0;
                        summary.skipCount = 0;
                        summary.timeSpent = 0;
                        summary.progress = 0;
                        summary.proficiency = 0;

                        var skillEarned = 0;
                        _.each(practices, function (p) {
                            summary.attemptedQuestionCount += (p.summary.correctCount + p.summary.incorrectCount);
                            summary.totalQuestion += p.summary.totalQuestion;
                            summary.correctCount += p.summary.correctCount;
                            summary.incorrectCount += p.summary.incorrectCount;
                            summary.skipCount += p.summary.skipCount;
                            summary.accuracy += p.summary.accuracy;
                            summary.timeSpent += p.summary.timeSpent;
                            summary.proficiency += p.summary.proficiency;
                            summary.progress += p.summary.progress;
                        })

                        //  Calculate average of progress against all topic of this subject
                        if (topicCount && topicCount > 0) {
                            summary.progress = Math.ceil(summary.progress / topicCount);
                        } else summary.progress = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / practices.length;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        summary.proficiency = Math.ceil(summary.proficiency / practices.length);
                        console.log("Old summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }
        var getSubjectSummary = function (topicCount) {
            var defer = Q.defer()
            // console.log("practice detail : %j", practiceDetail);
            Summary.aggregate([{
                $match: {
                    $and: [
                        { "subject": practiceDetail.subject },
                        { "summaryType": "topic" },
                        { "userId": Mongoose.Types.ObjectId(b.userId) }
                    ]
                },
            },
            {
                $group: {
                    _id: "$summaryType",
                    totalQuestion: { "$sum": "$summary.totalQuestion" },
                    correctCount: { "$sum": "$summary.correctCount" },
                    incorrectCount: { "$sum": "$summary.incorrectCount" },
                    accuracy: { "$sum": "$summary.accuracy" },
                    skipCount: { "$sum": "$summary.skipCount" },
                    timeSpent: { "$sum": "$summary.timeSpent" },
                    proficiency: { "$sum": "$summary.proficiency" },
                    progress: { "$sum": "$summary.progress" },
                    numberOfPractices: { "$sum": 1 },
                }
            }
            ], function (err, data) {
                if (!err) {
                    if (data != null && data.length > 0) {
                        var summary = data[0];
                        summary.attemptedQuestionCount = summary.correctCount + summary.incorrectCount;
                        //  Calculate average of progress against all topic of this subject
                        if (topicCount && topicCount > 0) {
                            summary.progress = Math.ceil(summary.progress / topicCount);
                        } else summary.progress = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / summary.numberOfPractices;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        summary.proficiency = Math.ceil(summary.proficiency / summary.numberOfPractices);
                        // console.log("New summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No topic level summary found for this subject", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var updateSubjectSummary = function (summary) {
            var defer = Q.defer();
            Summary.update({
                subject: practiceDetail.subject,
                userId: Mongoose.Types.ObjectId(b.userId),
                "summaryType": "subject"
            }, {
                    $set: {
                        "summary": summary,
                        "subject": practiceDetail.subject,
                        "userId": b.userId,
                        "summaryType": "subject"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve();
                    } else {
                        defer.resolve();
                    }
                })
            return defer.promise;
        };
        var getChapterSummary = function (topicCount) {
            var defer = Q.defer()

            Summary.aggregate([{
                $match: {
                    $and: [
                        { "chapter": practiceDetail.chapter },
                        { "summaryType": "topic" },
                        { "userId": Mongoose.Types.ObjectId(b.userId) }
                    ]
                }
            },
            {
                $group: {
                    _id: "$summaryType",
                    totalQuestion: { "$sum": "$summary.totalQuestion" },
                    correctCount: { "$sum": "$summary.correctCount" },
                    incorrectCount: { "$sum": "$summary.incorrectCount" },
                    accuracy: { "$sum": "$summary.accuracy" },
                    skipCount: { "$sum": "$summary.skipCount" },
                    timeSpent: { "$sum": "$summary.timeSpent" },
                    proficiency: { "$sum": "$summary.proficiency" },
                    progress: { "$sum": "$summary.progress" },
                    numberOfPractices: { "$sum": 1 },
                }
            }
            ], function (err, data) {
                if (!err) {
                    if (data != null && data.length > 0) {
                        var summary = data[0];
                        summary.attemptedQuestionCount = summary.correctCount + summary.incorrectCount;
                        //  Calculate average of progress against all topic of this subject
                        if (topicCount && topicCount > 0) {
                            summary.progress = Math.ceil(summary.progress / topicCount);
                        } else summary.progress = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / summary.numberOfPractices;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        summary.proficiency = Math.ceil(summary.proficiency / summary.numberOfPractices);
                        // console.log("New summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No topic level summary found for this chapter", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var updateChapterSummary = function (summary) {
            var defer = Q.defer();
            Summary.update({
                chapter: practiceDetail.chapter,
                userId: Mongoose.Types.ObjectId(b.userId),
                "summaryType": "chapter"
            }, {
                    $set: {
                        "summary": summary,
                        "subject": practiceDetail.subject,
                        "userId": b.userId,
                        "subject": practiceDetail.subject,
                        "unit": practiceDetail.unit,
                        "summaryType": "chapter"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve();
                    } else {
                        defer.resolve();
                    }
                })
            return defer.promise;
        };
        var getUnitSummary = function (topicCount) {
            var defer = Q.defer()

            Summary.aggregate([{
                $match: {
                    $and: [
                        { "unit": practiceDetail.unit },
                        { "summaryType": "topic" },
                        { "userId": Mongoose.Types.ObjectId(b.userId) }
                    ]
                }
            },
            {
                $group: {
                    _id: "$summaryType",
                    totalQuestion: { "$sum": "$summary.totalQuestion" },
                    correctCount: { "$sum": "$summary.correctCount" },
                    incorrectCount: { "$sum": "$summary.incorrectCount" },
                    accuracy: { "$sum": "$summary.accuracy" },
                    skipCount: { "$sum": "$summary.skipCount" },
                    timeSpent: { "$sum": "$summary.timeSpent" },
                    proficiency: { "$sum": "$summary.proficiency" },
                    progress: { "$sum": "$summary.progress" },
                    numberOfPractices: { "$sum": 1 },
                }
            }
            ], function (err, data) {
                if (!err) {
                    if (data != null && data.length > 0) {
                        var summary = data[0];
                        summary.attemptedQuestionCount = summary.correctCount + summary.incorrectCount;
                        //  Calculate average of progress against all topic of this subject
                        if (topicCount && topicCount > 0) {
                            summary.progress = Math.ceil(summary.progress / topicCount);
                        } else summary.progress = 0;
                        summary.score = summary.correctCount + "/" + summary.totalQuestion;
                        //  Calculate average accuracy
                        summary.accuracy = summary.accuracy / summary.numberOfPractices;
                        if (summary.accuracy >= 80) {
                            summary.description = "<strong>Your performance in this subject is very good!!</strong>";
                        } else {
                            summary.description = "<strong>Looks like you need to earn more skills in this subject</strong>";
                        }
                        //  Calculate average proficiency
                        summary.proficiency = Math.ceil(summary.proficiency / summary.numberOfPractices);
                        // console.log("New summary : %j", summary);
                        defer.resolve(summary);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No topic level summary found for this chapter", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var updateUnitSummary = function (summary) {
            var defer = Q.defer();
            Summary.update({
                unit: practiceDetail.unit,
                userId: Mongoose.Types.ObjectId(b.userId),
                "summaryType": "unit"
            }, {
                    $set: {
                        "summary": summary,
                        "subject": practiceDetail.subject,
                        "userId": b.userId,
                        "unit": practiceDetail.unit,
                        "summaryType": "unit"
                    }
                }, {
                    upsert: true
                }, function (err, result) {
                    if (!err) {
                        defer.resolve(summary);
                    } else {
                        defer.resolve(summary);
                    }
                })
            return defer.promise;
        };
        getPracticeDetails()
            .then(function () {
                return endPractice();
            })
            .then(function () {
                return getTopicSummary();
            })
            .then(function (topicSummary) {
                return updateTopicSummary(topicSummary);
            })
            .then(function () {
                return getTopicCountBySubject(practiceDetail.subject);
            })
            .then(function (topicCount) {
                b.topicCount = topicCount;
                return getSubjectSummary(topicCount);
            })
            .then(function (summary) {
                return updateSubjectSummary(summary);
            })
            .then(function () {
                return getChapterSummary(b.topicCount);
            })
            .then(function (summary) {
                return updateChapterSummary(summary);
            })
            .then(function () {
                return getUnitSummary(b.topicCount);
            })
            .then(function (summary) {
                return updateUnitSummary(summary);
            })
            .then(function (summary) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                res.json(out)
            })
            .fail(function (out) {
                res.json(out);
            })
    });


    /**
     * @api {get} /api/practices/:practiceId/summary Get summary By Practice
     * @apiName Get summary of a pratice 
     * @apiDescription Returns summary of progress performed by this user for this particular practice
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In url . (Id is practice id) sample value :- 59f7200ca7a3140004d88f51
     * @apiParamExample {json} Response-Example:
     * {
     *    "status": C.STATUS_SUCCESS_CODE,
     *    "message": "success",
     *    "data": [
     *    {
     *    "topicId": "5a0c4123d958f34ac6cc2851",
     *    "score": "6/10",
     *    "result": "pass",
     *    "description": "You just did <strong>Incredible!!..</strong>",
     *    "totalQuestion": 10,
     *    "correctCount": 6,
     *    "incorrectCount": 2,
     *    "skipCount": 2,
     *    "accuracy": "60%",
     *    "timespent": "25 min",
     *    "skillEarned": "34%"
     *    }
     *    ],
     *    "paginate": {},
     *    "error": {}
     *    }
     */

    app.get('/api/practices/:practiceId/summary', function (req, res) {
        var out;
        var b = req.params;
        var summary = {};
        var getSummary = function () {
            var defer = Q.defer();
            Practice.find({
                _id: b.practiceId
            }, { summary: 1 }, { lean: true }, function (err, practice) {
                if (!err) {
                    if (practice && practice.length > 0) {
                        var summary = practice[0].summary;
                        if (summary.accuracy >= 80) {
                            summary.description = "Yay!! You did it .You were awesome";
                        } else {
                            summary.description = "You need to do more practice";
                        }
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'seems practice not started yet', b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getSummary()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {post} /api/practices/:practiceId/submit Submit practice
     * @apiName Submit practice
     * @apiDescription Submit practice 
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} topicId . In body
     * @apiParam {string} questionId . In body .question id is when yo get question in respone their is an _id which is questionId
     * @apiParam {string} practiceId . In url
     * @apiParam {string} qId . In body : On every submit pass this qId as well along with questionId
     * @apiParam {string} answer . In body .sample value :- 
     * [
     *   {
     *   "optionId": 3,
     *   "mappedTo": ""
     *   }
     *   ]
     */

    app.post('/api/practices/:practiceId/submit', function (req, res) {
        var out;
        var response = {};
        var b = {};
        try {
            b = JSON.parse(req.body.body);
        } catch (ex) {
            b = req.body;
        }
        b.userId = req.headers.userid;
        b.practiceId = req.params.practiceId;
        // var stringAnswer = JSON.stringify(b.answer);
        try {
            b.parseAnswer = JSON.parse(b.answer);
        } catch (ex) {
            b.parseAnswer = b.answer;
            console.log("not able to parse answer. Seems from web");
        }
        var qId = U.getUid();
        console.log("answer : " + b.answer);
        // console.log("answer length: " + b.parseAnswer.length);
        var getLevelId = function () {
            var defer = Q.defer();
            Practice.find({
                _id: b.practiceId
            }, function (err, level) {
                if (!err) {
                    try {
                        b.levelId = level[0].levelId;
                        b.topicId = level[0].topicId;
                    } catch (e) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'seems this practice session does not exist', '', e);
                        defer.reject(out);
                    }
                    defer.resolve();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this practice doesn't have any information about level", b);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var validateQuestion = function () {
            var defer = Q.defer();
            Question.find({
                _id: b.questionId
            }, function (err, question) {
                if (!err) {
                    if (question == null || question.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {
                        defer.resolve(question);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var checkAnswer = function (question) {
            var defer = Q.defer();
            if (!b.parseAnswer || b.parseAnswer.length == 0) {
                //  This question has been skipped
                response.answer = question[0].answer;
                response.displayText = "";
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'skipped', question);
                defer.resolve(out);
            }
            else if (question[0].answer.length != b.parseAnswer.length) {
                response.answer = question[0].answer;
                response.displayText = "Incorrect Answer !";
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'incorrect', question);
                defer.resolve(out);
            } else {
                var isCorrect = false;
                var answer = question[0].answer;
                for (var i = 0; i < answer.length; i++) {
                    for (var j = 0; j < b.parseAnswer.length; j++) {
                        if (answer[i].optionId == b.parseAnswer[j].optionId) {
                            isCorrect = true;
                            break;
                        } else isCorrect = false;
                    }
                    //  Atleast one of the option is not matched with user answer
                    if (!isCorrect)
                        break;
                }
                response.isCorrect = isCorrect;
                response.answer = question[0].answer;
                response.solution = question[0].solution ? question[0].solution : {};
                if (isCorrect) {
                    response.displayText = "Correct Answer !";
                    out = U.getJson(C.STATUS_SUCCESS_CODE, 'correct', question);
                } else {
                    response.displayText = "Incorrect Answer !";
                    out = U.getJson(C.STATUS_SUCCESS_CODE, 'incorrect', question);
                }
                defer.resolve(out);
            }
            return defer.promise;
        };
        var updateUserActivity = function (message) {
            var defer = Q.defer();
            Practice.update({
                //_id: b.practiceId,
                "questions.qId": b.qId
            }, {
                    '$set': {
                        'questions.$.status': message,
                        'questions.$.optionIds': b.parseAnswer,
                        'questions.$isCorrect': response.isCorrect,
                        'questions.$.receivedTime': U.getTimeStamp()
                    }
                }, {
                    upsert: true
                },
                function (err, activity) {
                    if (!err) {
                        //out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, question);
                        defer.resolve();

                    } else {
                        //out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.resolve();
                    }
                });
            return defer.promise;
        };
        var pushQuestionInActivity = function (question, practiceId) {
            var defer = Q.defer();
            Practice.update({
                _id: b.practiceId,
            }, {
                    $push: {
                        questions: {
                            qId: qId,
                            sentTime: U.getTimeStamp(),
                            questionId: response.nextQuestion._id,
                            level: b.levelId,
                            date: U.getTimeStamp(),
                        }
                    }
                }, function (err, data) {
                    if (!err) {
                        defer.resolve(question);
                    } else {
                        defer.resolve(question);
                    }
                    // console.log("User activity :-", JSON.stringify(data));
                })
            return defer.promise;
        };
        J.verifyUser(b.userId)
            .then(function (user) {
                b.segmentId = user.segment;
                b.subSegmentId = user.subSegment;
                return getLevelId();
            })
            .then(function () {
                return validateQuestion();
            })
            .then(function (question) {
                return checkAnswer(question);
            })
            .then(function (out) {
                return updateUserActivity(out.message);
            })
            .then(function () {
                return getQuestion(b.userId, b.levelId, b.topicId, b.segmentId, b.subSegmentId);
            })
            .then(function (question) {
                if (question != null && question.length > 0) {
                    response.nextQuestion = question[0];
                    response.nextQuestion.qId = qId;
                    return J.updateQuestion(question, b.userId);
                } else {
                    response.nextQuestion = {};
                }
            })
            .then(function (question) {
                if (question)
                    return pushQuestionInActivity(question, b.practiceId);
            })
            .then(function () {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, response);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
    /**
        * @api {get} /api/topics/:id/summary Get summary By Topic
        * @apiName Get summary of a topic
        * @apiDescription Returns summary of progress performed by this user on this particular topic
        * @apiGroup Mobile
        * @apiParam {string} userId . In Header
        * @apiParam {string} authToken . In Header
        * @apiParam {string} apiKey . In Header
        * @apiParam {string} version . In Header
        * @apiParam {string} id . In url . (Id is topic id) sample value :- 59f7200ca7a3140004d88f51
        * @apiParamExample {json} Response-Example:
        * {
            status: C.STATUS_SUCCESS_CODE,
            message: "success",
            data: [
            {
                score: "6/10",
                result: "pass",
                description: "You just did <strong>Incredible!!..</strong>",
                totalQuestion: 10,
                correctCount: 6,
                incorrectCount: 2,
                skipCount: 2,
                accuracy: "60%",
                timespent: "25 min",
                skillEarned: "34%",
                progress: 30
            }],
            paginate: { },
            error: { }
            }
        */
    app.get('/api/topics/:id/summary', function (req, res) {
        var out;
        b = req.params;
        b.userId = req.headers.userid;

        var getItemDetail = function () {
            var defer = Q.defer();
            Topic.findOne({
                _id: Mongoose.Types.ObjectId(b.id),
                "isActive": true,
                "isDeleted": false
            }, { name: 1 }, { lean: true },
                function (err, topicDetail) {
                    if (!err) {
                        if (topicDetail && topicDetail.name) {
                            defer.resolve(topicDetail);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this topic doesn't exist anymore", b);
                            defer.reject(out);
                        }
                    } else {
                        console.error("error while fetching practice summary : %j", err);
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Can not fetch summary for this topic', b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };

        var getSummary = function (topicDetail) {
            var defer = Q.defer();
            Summary.find({
                userId: b.userId,
                topicId: b.id
            }, { summary: 1 }, { lean: true },
                function (err, data) {
                    if (!err) {
                        if (data && data.length > 0) {
                            var summary = data[0].summary;
                            summary.topic = topicDetail;
                            var out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                            defer.resolve(out);
                        } else {
                            var summary = {};
                            summary.score = "0";
                            summary.description = "<strong> Looks like you need to earn more skills in this topic </strong>";
                            summary.totalQuestion = 0;
                            summary.correctCount = 0;
                            summary.incorrectCount = 0;
                            summary.skipCount = 0;
                            summary.accuracy = 0;
                            summary.timeSpent = 0;
                            summary.proficiency = 0;
                            summary.progress = 0;
                            summary.topic = topicDetail;

                            var out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                            defer.resolve(out);
                        }
                    } else {
                        console.error("error while fetching practice summary : %j", err);
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Can not fetch summary for this topic', b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getItemDetail()
            .then(function (topicDetail) {
                return getSummary(topicDetail);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })

    })

    /**
         * @api {get} /api/subjects/:id/practices Get all practices
         * @apiName Get all practices by Subject
         * @apiDescription Get all practices by Subject
         * @apiGroup Mobile
         * @apiParam {string} userId . In Header
         * @apiParam {string} authToken . In Header
         * @apiParam {string} apiKey . In Header
         * @apiParam {string} version . In Header
         * @apiParam {string} id . In url . (Id is subject id)
         */

    app.get('/api/subjects/:id/practices', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        var getAllPractices = function () {
            var defer = Q.defer();
            var query = Practice.find({
                userId: Mongoose.Types.ObjectId(b.userId),
                subject: Mongoose.Types.ObjectId(b.id)
            }, {
                    chapter: 1,
                    startTime: 1,
                    levelId: 1,
                    subject: 1,
                    topicId: 1,
                    summary: 1,
                    endTime: 1,
                    unit: 1,
                    createdAt: 1
                });
            query.lean();
            query.populate('unit subject chapter topicId', 'name iconUrl')
            query.exec(function (err, practices) {
                if (!err) {
                    if (practices == null || practices.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {

                        var responeArr = [];
                        for (var i = 0; i < practices.length; i++) {
                            try {
                                var response = {};
                                response.score = practices[i].summary.correctCount + "/" + practices[i].summary.totalQuestion;
                                response.accuracy = practices[i].summary.accuracy;
                                response.timespent = practices[i].summary.timeSpent;
                                response.levelId = practices[i].levelId;
                                response.practiceId = practices[i]._id;
                                response.startTime = practices[i].startTime;
                                response.timeStamp = practices[i].startTime;
                                response.endTime = practices[i].endTime;
                                response._id = practices[i]._id;
                                responeArr.push(response);
                            } catch (e) {
                                console.log("An error occurred");
                            }
                        }
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, practices);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllPractices()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/users/topics/:id/practices Get all practices
     * @apiName Get all practices
     * @apiDescription Get all practices
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In url . (Id is topic id) sample value :- 59f7200ca7a3140004d88f51
     */

    app.get('/api/users/topics/:id/practices', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        var getAllPractices = function () {
            var defer = Q.defer();
            Practice.aggregate([{
                $match: {
                    userId: Mongoose.Types.ObjectId(b.userId),
                    topicId: Mongoose.Types.ObjectId(b.id)
                }
            }], function (err, practices) {
                if (!err) {
                    if (practices == null || practices.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {

                        var responeArr = [];
                        for (var i = 0; i < practices.length; i++) {
                            try {
                                var response = {};
                                response.score = practices[i].summary.correctCount + "/" + practices[i].summary.totalQuestion;
                                response.correctCount = practices[i].summary.correctCount;
                                response.totalQuestion = practices[i].summary.totalQuestion;
                                response.accuracy = practices[i].summary.accuracy;
                                response.timespent = practices[i].summary.timeSpent;
                                response.timeSpent = practices[i].summary.timeSpent;
                                response.practiceDate = practices[i].createdAt;
                                response.levelId = practices[i].levelId;
                                response.practiceId = practices[i]._id;
                                response.startTime = practices[i].startTime;
                                response.timeStamp = practices[i].startTime;
                                response.endTime = practices[i].endTime;
                                response._id = practices[i]._id;
                                responeArr.push(response);
                            } catch (e) {
                                console.log("An error occured");
                            }
                        }
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, responeArr);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllPractices()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/users/topics/:id/practices Get all question of an practice
     * @apiName Get all question of an practice
     * @apiDescription Get all question of an practice
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In url . (Id is topic id) sample value :- 59f7200ca7a3140004d88f51
     * @apiParam {string} practiceId 
     */

    app.get('/api/users/topics/:id/practices/:practiceId/questions', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        console.log("data from input", b);
        var getPracticeQuestions = function () {
            var defer = Q.defer();
            Practice.find({
                userId: b.userId,
                "activity.topicId": b.id,
                "activity.practices.practiceId": b.practiceId
            }, {
                    _id: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    userId: 0,
                    __v: 0,
                    "activity.summary": 0
                }).populate("activity.practices.questions.questionId", "questionType questionHint questionsText options answer").exec(function (err, practices) {
                    if (!err) {
                        //console.log("practices", JSON.stringify(practices[0].activity));
                        if (practices == null || practices.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            defer.reject(out);
                        } else {
                            try {
                                var questions = practices[0].activity[0].practices[0].questions;
                            } catch (e) {
                                console.log("An error occured");
                            }
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, questions);
                            defer.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getPracticeQuestions()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}