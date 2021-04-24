var U = require('./../share/util.api');
var C = require('./../constant');
var Question = require('./../models/questions.model');
var Topic = require('./../models/topics.model');
var Student = require('./../models/registration.model');
var request = require('request');
var Q = require('q');
var Mongoose = require('mongoose');
var async = require('async');
module.exports = function (app) {


    /**
     * @api {post} /api/admin/questions Add new Question
     * @apiName Add question 
     * @apiDescription Add a new question 
     * @apiGroup Questions Admin 
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {array} topicIds . In body .Array of objectIds
     * @apiParam {string} questionsText . In body -Type String
     * @apiParam {array} questionImage . In body  [{'questionImage':[{imageUrl:String,caption:String}]
     * @apiParam {string} questionHint . In body -Type String
     * @apiParam {string} numberOfOptions . In body -Type Number Should be 2 to 6
     * @apiParam {string} questionType . In body  -Type String
     * @apiParam {array} answer . In body  [{optionId:Number,mappedTo:String}] In case of fill in the blank mappedTo required
     * @apiParam {array} options . In body -Type Array of objects
     * @apiParam {array} selectedSubSegments . In body -Type Array of objects
     * @apiParam {object} solution (optional) . In body - {solutionImages: [{solutionImageUrl: "url.com/image.png",caption: "figure 1"}],solutionText: ""}
     * @apiParam {string[]} tags . In body -Type Array "tags":["nodejs","java","javascript"]
     * @apiParamExample {json} Request-Example:
     *    {
     *   "questionsText": "who lift the world cup in 2011 ?",
     *   "difficultyLevel": 2,
     *   "questionImage": [
     *   {}
     *   ],
     *   "questionHint": "Bangladesh",
     *   "referenceMedia": [
     *   {
     *       "mediaUrl": "http://loremflickr.com/320/240/dog",
     *       "mediyaType": "image",
     *       "caption": "this is an test caption"
     *   }
     *   ],
     *   "tags": [
     *   "nodejs",
     *   "java",
     *   "javascript"
     *   ],
     *   "numberOfOptions": 2,
     *   "questionType": "Single Choice",
     *   "answer": [
     *   {
     *       "optionId": 3,
     *       "mappedTo": ""
     *   }
     *   ],
     *   "options": [
     *   {
     *       "optionText": "Aus",
     *      "isImage": false,
     *       "optionImageUrl": "",
     *       "optionId": 1
     *   },
     *   {
     *       "optionText": "England",
     *       "isImage": false,
     *      "optionImageUrl": "",
     *       "optionId": 2
     *   },
     *   {
     *       "optionText": "India",
     *       "isImage": false,
     *       "optionImageUrl": "",
     *       "optionId": 3
     *   },
     *   {
     *       "optionText": "Pak",
     *       "isImage": false,
     *       "optionImageUrl": "",
     *       "optionId": 4
     *   }
     *   ]
     *   }
     */

    app.post('/api/admin/questions', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        // console.log('Data from Input', b);
        var getTopic = function () {
            var defer = Q.defer();
            Topic.find({
                _id: {
                    $in: b.topicIds.map(function (o) {
                        return Mongoose.Types.ObjectId(o);
                    })
                },
                isDeleted: false
            }, function (err, question) {
                if (!err) {
                    defer.resolve(question);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var addQuestion = function (data) {
            var defer = Q.defer();
            var question = new Question();
            var options = {};
            console.log("question amtrix " + JSON.stringify(b.questionMatrix));
            //  TODO there would be multiple segments if topicIds are more than 1.
            question.segments = data[0].segments;
            question.subSegments = b.selectedSubSegments;
            question.subject = data[0].subjects;
            question.units = data[0].units;
            question.chapters = data[0].chapters;
            question.questionsText = b.questionsText;
            question.questionImage = b.questionImage;
            question.questionHint = b.questionHint;
            question.numberOfOptions = b.numberOfOptions;
            question.questionType = b.questionType;
            question.answerType = b.answerType;
            question.questionMatrix = b.questionMatrix;
            question.optionMatrix = b.optionMatrix;
            question.options = b.options;
            question.tags = b.tags;
            question.topics = b.topicIds;
            question.answer = b.answer;
            question.users = b.users;
            question.solution = b.solution;
            question.timestamp = U.getTimeStamp();

            question.save(function (err, data) {
                if (!err) {
                    defer.resolve(data);
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'An error occured please try again later', b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        getTopic()
            .then(function (question) {
                if (question == null || question.length == 0) {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'no data found', b);
                    res.json(out);
                } else {
                    return addQuestion(question);
                }
            })
            .then(function (data) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/questions/:id Get Question by id
     * @apiName Get question by id
     * @apiDescription Get questions
     * @apiGroup Questions
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param . (Id is question id)
     */

    app.get('/api/admin/questions/:id', function (req, res) {
        var out;
        var b = {};
        b.questionId = req.params.id;

        var getQuestion = function () {
            var defer = Q.defer();
            Question.find({
                _id: b.questionId
            }, {
                    userIds: 0,
                    users: 0,
                    // subSegments: subSegmentId
                }
            )
                .populate('topics subject chapters units segments subSegments.subSegmentId', 'name isDeleted')
                .lean()
                .exec(function (err, questions) {
                    if (!err) {
                        if (questions.length != 0 && questions != null) {
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, questions);
                            defer.resolve(out);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.NO_DATA_FOUND, b);
                            defer.reject(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getQuestion()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/admin/questions Get all questions
     * @apiName Get question
     * @apiDescription Get all questions || Filter by fields
     * @apiGroup Questions Admin
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query param pageNumber=1
     * @apiParam {string} pageSize . In Query param &pageSize=30
     * @apiParam {string} segmentIds . In Query param &segmentIds=59f706b2a60ca20004bd463a|59fefe4937ae9900043a32dd
     * @apiParam {string} subSegmentIds . In Query param &subSegmentIds=59f706c0a60ca20004bd463b|59fefe6b37ae9900043a32df
     * @apiParam {string} subjectId . In Query param subjectId=59f70721a60ca20004bd463e
     * @apiParam {string} unitIds . In Query param &unitIds=5a0c364edf483f484438e00a|5a0282ba580d78bc866b9314
     * @apiParam {string} chapterIds . In Query param &chapterIds=5a0c3ccdaf023c497141b592|59f71ffba7a3140004d88f50
     * @apiParam {string} topicIds . In Query param 
     * @apiParam {string} difficultyLevel . In Query param &difficultyLevel=1 (easy=1 | medium=2 | hard=3)
     * @apiParam {string} questionType . In Query param CHOICE_SINGLE | CHOICE_MULTIPLE | CHOICE_BOOLEAN | CHOICE_ASSERTION etc
     * @apiParam {number} numberOfOptions . In Query param 
     * @apiParam {boolean} questionImage . In Query param true=get only question having images, false get only question having no images
     */
    app.get('/api/admin/questions', function (req, res) {
        var out;
        var b = {};
        try {
            b.userId = req.headers.userid;
            b.pageNumber = req.query.pageNumber;
            b.pageSize = req.query.pageSize;
            b.subject = req.query.subjectId;
            b.segmentIds = req.query.segmentIds;
            b.subSegmentIds = req.query.subSegmentIds;
            b.unitIds = req.query.unitIds;
            b.chapterIds = req.query.chapterIds;
            b.topicIds = req.query.topicIds;
            b.difficultyLevel = req.query.difficultyLevel;
            b.questionType = req.query.questionType;
            b.numberOfOptions = req.query.numberOfOptions;
            b.questionImage = req.query.questionImage;


            var pageOptions = {
                page: parseInt(b.pageNumber) || 1,
                limit: parseInt(b.pageSize) || C.PAGINATION_DEFAULT_PAGE_SIZE
            }
            var query = Question.find({
                isDeleted: false
            });
            if (b.subject)
                if (Mongoose.Types.ObjectId.isValid(b.subject))
                    query.where("subject").in([Mongoose.Types.ObjectId(b.subject)])
                else
                    throw "Provided id is invalid";

            if (b.segmentIds && b.segmentIds.length > 0) {
                var segments = b.segmentIds.split("|");
                query = query.where('segments').in(
                    segments.map(function (o) {
                        if (Mongoose.Types.ObjectId.isValid(o))
                            return Mongoose.Types.ObjectId(o);
                        else
                            throw "Provided id is invalid";
                    })
                )
            }
            if (b.subSegmentIds && b.subSegmentIds.length > 0) {
                var subSegments = b.subSegmentIds.split("|");
                query = query.where('subSegments.subSegmentId').in(
                    subSegments.map(function (o) {
                        if (Mongoose.Types.ObjectId.isValid(o))
                            return Mongoose.Types.ObjectId(o);
                        else
                            throw "Provided id is invalid";
                    })
                )
            }
            if (b.unitIds && b.unitIds.length > 0) {
                var units = b.unitIds.split("|");
                query = query.where('units').in(
                    units.map(function (o) {
                        if (Mongoose.Types.ObjectId.isValid(o))
                            return Mongoose.Types.ObjectId(o);
                        else
                            throw "Provided id is invalid";
                    })
                )
            }
            if (b.chapterIds && b.chapterIds.length > 0) {
                var chapters = b.chapterIds.split("|");
                query = query.where('chapters').in(
                    chapters.map(function (o) {
                        if (Mongoose.Types.ObjectId.isValid(o))
                            return Mongoose.Types.ObjectId(o);
                        else
                            throw "Provided id is invalid";
                    })
                )
            }
            if (b.topicIds && b.topicIds.length > 0) {
                var topics = b.topicIds.split("|");
                query = query.where('topics').in(
                    topics.map(function (o) {
                        if (Mongoose.Types.ObjectId.isValid(o))
                            return Mongoose.Types.ObjectId(o);
                        else
                            throw "Provided id is invalid";
                    })
                )
            }
            if (b.difficultyLevel && b.difficultyLevel != "") {
                query = query.where('subSegments.difficultyLevel').equals(b.difficultyLevel);
            }
            if (b.questionType && b.questionType != "") {
                query = query.where('questionType').equals(b.questionType);
            }
            if (b.numberOfOptions && b.numberOfOptions != "") {
                if (parseInt(b.numberOfOptions))
                    query = query.where('numberOfOptions').equals(b.numberOfOptions);
                else throw "Value for Number of options is not a valid number";
            }
            if (b.questionImage && b.questionImage != "") {
                if (b.questionImage == "true")
                    query = query.where('questionImage.0').exists(true);
                else
                    query = query.where('questionImage.0').exists(false);
            }
            query.populate("segments subSegments.subSegmentId subject units chapters topics", "name");

            var getQuestionCount = function () {
                var defer = Q.defer();
                query.count().exec(function (err, questionCount) {
                    if (!err) {
                        b.questionCount = questionCount;
                        defer.resolve(questionCount);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
                return defer.promise;
            };
            var getQuestions = function () {
                var defer = Q.defer();
                query
                    .find()
                    .sort({
                        createdAt: -1
                    })
                    .select({
                        "_id": 1,
                        "questionsText": 1,
                        segments: 1,
                        subject: 1,
                        subSegments: 1,
                        units: 1,
                        chapters: 1,
                        topics: 1,
                        numberOfOptions: 1,
                        questionType: 1,
                        questionHint: 1,
                        questionImage: 1,
                        options: 1,
                        answer: 1,
                        createdAt: 1,
                        timestamp: 1,
                        isActive: 1,
                        questionMatrix: 1,
                        optionMatrix: 1

                    })

                    .lean()
                    .skip(pageOptions.limit * (pageOptions.page - 1))
                    .limit(pageOptions.limit)
                    .exec(function (err, questions) {
                        if (!err) {
                            defer.resolve(questions);
                        } else {
                            out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                            defer.reject(out);
                        }
                    })
                return defer.promise;
            };
            getQuestionCount()
                .then(function (questionCount) {
                    return getQuestions();
                })
                .then(function (questions) {
                    if (questions && questions.length > 0)
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, questions, "", U.getPaginationObject(b.questionCount, pageOptions.limit, pageOptions.page));
                    else out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No data found.", questions, "", U.getPaginationObject(b.questionCount, pageOptions.limit, pageOptions.page));
                    res.json(out);
                })
                .fail(function (out) {
                    res.json(out);
                })
        } catch (err) {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, err, b, err);
            res.json(out);
        }
    })

    /**
     * @api {put} /api/admin/questions/:id Update Question 
     * @apiName Update Question 
     * @apiDescription Update Question 
     * @apiGroup Questions
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is question id)In url
     * @apiParam {string} topicIds . In Body -Array of ids ["59f6f9fc4b96af0004b66e72"]
     * @apiParam {string} questionType . In Body
     * @apiParam {string} numberOfOptions . In Body
     * @apiParam {string} questionHint . In Body
     * @apiParam {string} questionsText . In Body
     * @apiParam {object} solution (optional) . In body - {solutionImages: [{solutionImageUrl: "url.com/image.png",caption: "figure 1"}],solutionText: ""}
     * @apiParam {array} questionImage . In body  [{'questionImage':[{imageUrl:String,caption:String}]
     * @apiParam {string} isActive .In Body
     * @apiParam {string} isDeleted .In Body
     * @apiParam {string} options .In Body
     * @apiParam {string} answer .In Body
     * @apiParam {string} chapterIds .In Body -Array of ids ["59f6f9fc4b96af0004b66e72"]
     * @apiParam {string} unitIds .In Body -Array of ids ["59f6f9fc4b96af0004b66e72"]
     * @apiParam {string} segmentIds .In Body -Array of ids ["59f6f9fc4b96af0004b66e72"]
     * @apiParam {string} subSegmentIds .In Body -Array of ids ["59f6f9fc4b96af0004b66e72"]
     */

    app.put('/api/admin/questions/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.questionId = req.params.id;
        b.userId = req.headers.userid;
        // console.log("body for update question : " + JSON.stringify(b));
        var findQuestion = function () {
            var defer = Q.defer();
            Question.find({
                _id: b.questionId,
                isDeleted: false
            }, function (err, question) {
                if (!err) {
                    if (question == null || question.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        defer.resolve(question);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateQuestion = function (question) {
            var defer = Q.defer();
            // if (b.topicIds && b.topicIds.length > 0) {
            //     topics = b.topicIds;
            // } else {
            //     topics = question[0].topics;
            // }
            if (b.questionType == undefined || b.questionType == '') {
                questionType = question[0].questionType;
            } else {
                questionType = b.questionType;
            }
            if (b.numberOfOptions == undefined || b.numberOfOptions == '') {
                numberOfOptions = question[0].numberOfOptions;
            } else {
                numberOfOptions = b.numberOfOptions;
            }
            if (b.questionHint == undefined || b.questionHint == '') {
                questionHint = question[0].questionHint;
            } else {
                questionHint = b.questionHint;
            }
            if (b.questionsText == undefined || b.questionsText == '') {
                questionsText = question[0].questionsText;
            } else {
                questionsText = b.questionsText;
            }
            if (b.solution == undefined || b.solution == {}) {
                solution = question[0].solution;
            } else {
                solution = b.solution;
            }
            if (b.options && b.options.length > 0) {
                options = b.options;
            } else {
                options = question[0].options;
            }
            if (b.answer && b.answer.length > 0) {
                answer = b.answer;
            } else {
                answer = question[0].answer;
            }
            //  Don't perform empty check here as we are supposed to allow deleting of all the images if user wants to
            questionImage = b.questionImage;
            // if (b.chapterIds && b.chapterIds.length > 0) {
            //     chapters = b.chapterIds;
            // } else {
            //     chapters = question[0].chapters;
            // }
            // if (b.unitIds && b.unitIds.length > 0) {
            //     units = b.unitIds;
            // } else {
            //     units = question[0].units;
            // }
            // if (b.segmentIds && b.segmentIds.length > 0) {
            //     segments = b.segmentIds;
            // } else {
            //     segments = question[0].segments;
            // }
            if (b.selectedSubSegments && b.selectedSubSegments.length > 0) {
                subSegments = b.selectedSubSegments;
            } else {
                subSegments = question[0].subSegments;
            }
            // if (!b.isActive || b.isActive == '') {
            //     isActive = question[0].isActive;
            // } else {
            isActive = b.isActive;
            // }
            if (b.isDeleted == undefined || b.isDeleted == '') {
                isDeleted = question[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    questionsText = U.getDeletedName(b.questionsText);
                }
                isDeleted = b.isDeleted;
            }
            updatedById = b.userId;
            Question.findByIdAndUpdate({
                _id: b.questionId
            }, {
                    $set: {
                        // "topics": topics,
                        "questionType": questionType,
                        "numberOfOptions": numberOfOptions,
                        "questionHint": questionHint,
                        "questionsText": questionsText,
                        "solution": solution,
                        "updatedById": updatedById,
                        "options": options,
                        "answer": answer,
                        "questionImage": questionImage,
                        // "chapters": chapters,
                        // "units": units,
                        // "segments": segments,
                        "subSegments": subSegments,
                        "isDeleted": isDeleted,
                        "isActive": isActive,
                    }
                }, {
                    upsert: true
                }, function (err, units) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, question);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        findQuestion()
            .then(function (question) {
                return updateQuestion(question);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {post} /api/admin/questionCount Get All Units with question count
     * @apiName Get Units with question count
     * @apiDescription Get All Unit with question count
     * @apiGroup Units
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} isActive . In Query param
     * @apiParam {string} subjectId . In Query param
     * @apiParam {string} subSegmentId . In Query param
     * @apiParam {string} segmentId . In Query param
     **/

    app.post('/api/admin/questionCount', function (req, res) {
        var out;
        var b = req.body;

        if (!b.segmentId || b.segmentId == "" || !b.subSegmentId || b.subSegmentId == "" || !b.subjectId || b.subjectId == "") {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide all the inputs", b);
            res.json(out);
            return;
        }
        var getCount = function (unitCount) {
            var defer = Q.defer();
            Question.aggregate([
                {
                    $unwind: "$subSegments"
                },
                {
                    $match: {
                        "subSegments.subSegmentId": Mongoose.Types.ObjectId(b.subSegmentId),
                        "segments": Mongoose.Types.ObjectId(b.segmentId),
                        "subject": Mongoose.Types.ObjectId(b.subjectId),
                        "isActive": true,
                        "isDeleted": false,

                    }
                }
                , {
                    $unwind: "$units"
                },
                {
                    $group: {
                        _id: { unit: "$units", qType: "$questionType", level: "$subSegments.difficultyLevel" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        "count": -1
                    }
                }
                , {
                    $project: {
                        unit: "$_id.unit",
                        qType: "$_id.qType",
                        level: "$_id.level",
                        count: 1,
                        _id: 0
                    }
                }

            ], function (err, units) {
                if (!err) {
                    if (units == null || units.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, units);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        getCount()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });


}