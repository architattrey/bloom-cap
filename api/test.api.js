var Q = require('q');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var J = require('./../share/comman.methods');
var moment = require('moment-timezone');
var Test = require('./../models/tests.model');
var Question = require('./../models/questions.model');
var TestSummary = require('./../models/testSummary.model');
var ObjectId = Mongoose.Schema.Types.ObjectId;
var _ = require('underscore')._;


module.exports = function (app) {

    /**
     * @api {post} /api/admin/tests Add new test
     * @apiName Add tests
     * @apiDescription Add new test
     * @apiGroup Tests - Admin
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParamExample {json} Request-Example:
     * {
     *   "testName": "My first Test",
     *   "startDate": 1510223111,
     *   "endDate": 1510223111,
     *   "instructions": "as your wish how you want to do !",
     *   "resultPass": {
     *   "message": "Nothing !",
     *   "imageUrl": "Nothing",
     *   "linkUrl": "Nothing"
     *   },
     *   "resultFail": {
     *   "message": "Nothing !",
     *   "imageUrl": "Nothing",
     *   "linkUrl": "Nothing"
     *   },
     *   "passingScore": 70,
     *   "segments": [
     *   "59f6f9c74b96af0004b66e71"
     *   ],
     *   "subSegments": [
     *   "59f6f9fc4b96af0004b66e72"
     *   ],
     *   "subject": "59f6fa1c4b96af0004b66e73",
     *   "units": [
     *   {
     *       "unitId": "59f701d5ffb4670004547131",
     *       "question": [
     *           {
     *               "questioType": "Single choice",
     *               "level": [
     *                   {
     *                       "difficultyLevel": 1,
     *                       "noOquestions": 3
     *                   }
     *               ]
     *           }
     *       ]
     *   }
     *   ],
     *   "marks": [
     *   {
     *       "difficultyLevel": 2,
     *       "marks": 3
     *   }
     *   ]
     *   }
     */
    app.post('/api/admin/tests', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        var addQuestion = function (data) {
            var defer = Q.defer();
            var test = new Test();
            var options = {};
            test.timestamp = U.getTimeStamp();
            test.testName = b.testName;
            test.startDate = b.startDate;
            test.endDate = b.endDate;
            test.instructions = b.instructions;
            test.resultRules = b.resultRules;
            test.passingCutOff = b.passingCutOff;
            test.segments = b.segmentIds;
            test.subSegments = b.subSegmentIds;
            test.subject = b.subjectId;
            test.unitDistribution = b.unitDistribution;
            test.marks = b.marks;
            test.duration = b.duration;
            test.totalQuestions = b.totalQuestion;
            test.totalMarks = b.totalMarks;
            test.createdById = b.userId;
            test.updatedById = b.userId;
            test.save(function (err, data) {
                if (!err) {
                    defer.resolve(data);
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'An error occurred please try again later', b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        addQuestion()
            .then(function (data) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/tests Get all test wit filters
     * @apiName Get tests
     * @apiDescription GEt test
     * @apiGroup Tests - Admin
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} isActive . In Query Param
     * @apiParam {string} subjectId . In Query Param
     * @apiParam {string} segmentId . In Query Param
     * @apiParam {string} subSegmentId . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} startDate . In Query Param
     * @apiParam {string} endDate . In Query Param
     */
    app.get('/api/admin/tests', function (req, res) {
        var out;
        var b = {};
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.subjectId = req.query.subjectId == undefined ? '' : req.query.subjectId;
        b.segmentId = req.query.segmentId == undefined ? '' : req.query.segmentId;
        b.subSegmentId = req.query.subSegmentId == undefined ? '' : req.query.subSegmentId;
        b.startDate = req.query.startDate == undefined ? '' : req.query.startDate;
        b.endDate = req.query.endDate == undefined ? '' : req.query.endDate;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var query = Test.find({ isDeleted: false });
        if (b.isActive != '')
            query = query.where('isActive').equals(b.isActive)
        if (b.startDate != '')
            query = query.where('startDate').equals(b.startDate)
        if (b.endDate != '')
            query = query.where('endDate').equals(b.endDate)
        if (b.subjectId != '')
            query = query.where('subject').equals(Mongoose.Types.ObjectId(b.subjectId));
        if (b.segmentId != '')
            query = query.where('segments').in([Mongoose.Types.ObjectId(b.segmentId)])
        if (b.subSegmentId != '')
            query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegmentId)])

        var getTestCount = function () {
            var defer = Q.defer();
            query.count();
            query.exec(function (err, testCount) {
                if (!err) {
                    b.testCount = testCount;
                    defer.resolve();
                } else {
                    defer.resolve();
                }
            })
            return defer.promise;
        };
        var getTests = function () {
            var defer = Q.defer();
            query.find();
            query.populate('subject unitDistribution.unitId  subSegments segments', 'name').skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, tests) {
                if (!err) {
                    if (tests != null || tests.length > 0) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, tests, err, U.getPaginationObject(b.testCount, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getTestCount()
            .then(function () {
                return getTests();
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/admin/tests/:id Get test by test Id
     * @apiName Get test by test Id
     * @apiDescription Get test by test Id
     * @apiGroup Tests - Admin
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In url id is test id
     */
    app.get('/api/admin/tests/:id', function (req, res) {
        var out;
        var b = req.params;
        var getTests = function () {
            var defer = Q.defer();
            Test.find({
                _id: b.id,
                isDeleted: false
            }
                , {
                    // "unitDistribution.unitId": 1
                }).populate('subject unitDistribution.unitId  subSegments segments', 'name').exec(function (err, tests) {
                    if (!err) {
                        if (tests != null || tests.length > 0) {
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, tests, err);
                            defer.resolve(out);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            defer.reject(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getTests()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


    /**
     * @api {put} /api/admin/tests/:id update test by test Id
     * @apiName update test by test Id
     * @apiDescription update test by test Id
     * @apiGroup Tests - Admin
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In url id is test id
     * @apiParam {string} isActive . In body true||false
     */
    app.put('/api/admin/tests/:id', function (req, res) {
        var out;
        var b = req.params;
        b.isActive = req.body.isActive;
        //console.log("data from input :-", b)
        var updateTest = function () {
            var defer = Q.defer();
            Test.update({
                _id: b.id
            }, {
                    $set: {
                        isActive: b.isActive
                    }
                }, function (err, result) {
                    if (!err) {
                        defer.resolve(result);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err, b);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        var getTests = function () {
            var defer = Q.defer();
            Test.find({
                _id: b.id,
                isDeleted: false
            }).populate('subject units.unitId  subSegments segments', 'name').exec(function (err, tests) {
                if (!err) {
                    if (tests != null || tests.length > 0) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, tests, err);
                        defer.resolve(tests);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        updateTest()
            .then(function () {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, b);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


    /**
     * @api {get} /api/tests Get test
     * @apiDeprecated
     * @apiName Get all tests
     * @apiDescription Get tests to be shown to user
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParamExample {json} Response-Example
     * {
            "status": C.STATUS_SUCCESS_CODE,
            "message": "success",
            "data": [
                {
                    "_id": "5a068f67e7cf1f37075dd02b",
                    "createdAt": "2017-11-11T05:49:27.562Z",
                    "updatedAt": "2017-11-13T05:35:29.616Z",
                    "subject": {
                        "_id": "59fefe9a37ae9900043a32e1",
                        "name": "Science",
                        "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/physics"
                    },
                    "passingScore": 33,
                    "testName": "Test 1",
                    "instructions": "<ol><li>This test consists of X questions</li><li>Testconsists of easy, medium and hard level of questions< /li></ol >",
                    "timestamp": 1510379367543,
                    "__v": 0,
                    "isDeleted": false,
                    "isActive": true,
                    "subSegments": [
                        {
                            "_id": "59fefe6b37ae9900043a32df",
                            "name": "XII",
                            "iconUrl": null
                        }
                    ],
                    "segments": [
                        {
                            "_id": "59f706b2a60ca20004bd463a",
                            "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
                            "name": "CBSE"
                        }
                    ]
                },
                {
                    "_id": "5a0693cc0ccca137e554843b",
                    "createdAt": "2017-11-11T06:08:12.301Z",
                    "updatedAt": "2017-11-11T06:08:12.301Z",
                    "subject": {
                        "_id": "59fefe9a37ae9900043a32e1",
                        "name": "Science",
                        "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/physics"
                    },
                    "passingScore": 33,
                    "instructions": "<ol><li>This test consists of X questions</li><li>Testconsists of easy, medium and hard level of questions< /li></ol >",
                    "testName": "Test 5",
                    "timestamp": 1510380492294,
                    "__v": 0,
                    "isDeleted": false,
                    "isActive": true,
                    "subSegments": [
                        {
                            "_id": "59fefe6b37ae9900043a32df",
                            "name": "XII",
                            "iconUrl": null
                        }
                    ],
                    "segments": [
                        {
                            "_id": "59f706b2a60ca20004bd463a",
                            "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
                            "name": "CBSE"
                        }
                    ]
                }
            ],
            "paginate": {},
            "error": {}
        }
     */
    app.get('/api/tests', function (req, res) {
        var out;
        var b = {};
        b.userId = req.headers.userid;
        var getTests = function (user) {
            var defer = Q.defer();
            var query = Test.find({
                isDeleted: false,
                isActive: true,
            }, {
                    resultRules: 0,
                    isDeleted: 0,
                    marks: 0,
                    unitDistribution: 0
                })
                .where('segments').in([Mongoose.Types.ObjectId(user.segment)])
                .lean()
                .where('subSegments').in([Mongoose.Types.ObjectId(user.subSegment)]);
            query.populate('subject units.unitId  subSegments segments', 'name iconUrl').exec(function (err, tests) {
                if (!err) {
                    if (tests != null || tests.length > 0) {
                        tests = tests.map(function (t) {
                            t.totalMarks = 100;
                            t.totalQuestions = 20;
                            t.isTestAttempted = false;
                            t.marksObtained = 0;
                            t.result = 'unknown';
                            return t;
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, tests, err);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
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
                return getTests(user);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


    /**
     * @api {get} /api/subjects/:id/tests Get test by subject
     * @apiName Get test by subjectId
     * @apiDescription Get test by subject id
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In Url (id is subject id)
     */
    app.get('/api/subjects/:id/tests', function (req, res) {
        var out;
        var b = {};
        b.subjectId = req.params.id;
        b.userId = req.headers.userid;
        var getTests = function (user) {
            var defer = Q.defer();
            var query = Test.find({
                isDeleted: false,
                isActive: true,
                subject: b.subjectId,
				startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
            }, {
                    resultRules: 0,
                    isDeleted: 0,
                    marks: 0,
                    unitDistribution: 0
                })
                .where('segments').in([Mongoose.Types.ObjectId(user.segment)])
                .lean()
                .where('subSegments').in([Mongoose.Types.ObjectId(user.subSegment)]);
            query.populate('subject units.unitId  subSegments segments', 'name iconUrl').exec(function (err, tests) {
                if (!err) {
                    if (tests != null && tests.length > 0) {
                        tests = tests.map(function (t) {
                            // t.totalMarks = 100;
                            // t.totalQuestions = 20;
                            t.isTestAttempted = false;
                            t.marksObtained = 0;
                            t.result = 'unknown';
                            return t;
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, tests, err);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
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
                return getTests(user);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
    * @api {get} /api/subjects/:id/mytests Get mytests
    * @apiName Get mytests by subject
    * @apiDescription Get mytests by subject
    * @apiGroup Mobile
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    * @apiParam {string} version . In Header
    * @apiParam {string} id . In Url (id is subject id)
    */
    app.get('/api/subjects/:id/mytests', function (req, res) {
        var out;
        var b = {};
        b.subjectId = req.params.id;
        b.userId = req.headers.userid;
        var getTests = function (user) {
            var defer = Q.defer();
            var query = TestSummary.find({
                userId: b.userId,
                subjectId: b.subjectId,
                testStatus: 'completed'
            }, {
                    testId: 1,
                    testReferenceId: 1,
                    startTime: 1,
                    subjectId: 1,
                    summary: 1,
                    endTime: 1,
                    testStatus: 1,
                    totalMarks: 1,
                    totalQuestions: 1,
                    marksObtained: 1,
                    result: 1,
                    createdAt: 1
                })
                .lean()
                .sort({ "updatedAt": - 1 })
                .populate('subjectId testId', 'name testName iconUrl').exec(function (err, tests) {
                    if (!err) {
                        if (tests != null && tests.length > 0) {
                            tests = tests.map(function (t) {
                                t.totalMarks = 100;
                                t.totalQuestions = 20;
                                t.isTestAttempted = true;
                                t.marksObtained = t.summary.score;
                                t.result = t.summary.result;
                                return t;
                            })
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, tests, err);
                            defer.resolve(out);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
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
                return getTests(user);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
    /**
     * @api {get} /api/tests/:testId/start Start Test
     * @apiName Start Test
     * @apiDescription Start Test for this particular user. One test can be started only once for a user. It will return all question at once 
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} testId . test Id to start
     * @apiParamExample {json} Response-Example
     * {
        "status": 200,
        "message": V9L3CNAD,  //Test Reference Id
        "data": [
            {
                "_id": "5a4d87cd811a755e263b7ec5",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "No hint available for this item",
                "questionsText": "<p>Which has the least packing efficiency?</p>",
                "options": [
                    {
                        "isImage": false,
                        "optionId": 1,
                        "optionImageUrl": "",
                        "optionText": "<p>Simple cubic</p>",
                        "_id": "5a4d87cd811a755e263b7eca"
                    },
                    {
                        "isImage": false,
                        "optionId": 2,
                        "optionImageUrl": "",
                        "optionText": "<p>Body centred cubic</p>",
                        "_id": "5a4d87cd811a755e263b7ec9"
                    },
                    {
                        "isImage": false,
                        "optionId": 3,
                        "optionImageUrl": "",
                        "optionText": "<p>Hexagonal closesd packed</p>",
                        "_id": "5a4d87cd811a755e263b7ec8"
                    },
                    {
                        "isImage": false,
                        "optionId": 4,
                        "optionImageUrl": "",
                        "optionText": "<p>Cubic closesd packed</p>",
                        "_id": "5a4d87cd811a755e263b7ec7"
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4d87ea811a755e263b7ecc",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "No hint available for this item",
                "questionsText": "<p>In hcp structure, the packing fraction is</p>",
                "options": [
                    {
                        "_id": "5a4d87ea811a755e263b7ed1",
                        "optionText": "<p>0.67</p>",
                        "optionImageUrl": "",
                        "optionId": 1,
                        "isImage": false
                    },
                    {
                        "_id": "5a4d87ea811a755e263b7ed0",
                        "optionText": "<p>0.68</p>",
                        "optionImageUrl": "",
                        "optionId": 2,
                        "isImage": false
                    },
                    {
                        "_id": "5a4d87ea811a755e263b7ecf",
                        "optionText": "<p>0.89</p>",
                        "optionImageUrl": "",
                        "optionId": 3,
                        "isImage": false
                    },
                    {
                        "_id": "5a4d87ea811a755e263b7ece",
                        "optionText": "<p>0.76</p>",
                        "optionImageUrl": "",
                        "optionId": 4,
                        "isImage": false
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4d8897811a755e263b7ed3",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "No hint available for this item",
                "questionsText": "<p>What is the inverse matrix of $$\\begin{vmatrix}c&nbsp;&amp; a \\\\ a&nbsp;&amp; d\\end{vmatrix}$$</p>",
                "options": [
                    {
                        "isImage": false,
                        "optionId": 1,
                        "optionImageUrl": "",
                        "optionText": "<p><img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGIAAABUCAYAAAB5huK+AAAHPklEQVR4Xu2dZ6g1NRCGn8+OFUHsgtixdyxg94f+sCt2BRVB7GL5ISgqWEGxIdixd1FUxF6xg10U7Cg2VBR744UJhNyzZ2/ZSaIm8PHduyd3d/K+mWRmNjNnFq1VgcCsKqRoQhCI2ALYHPgIuKbh4o7ABLwDEacCpwBPAOrUmi8CE/BuRPgC3nX3RkQZ3Cc8tRHRiKgEgUrEKKoRcwHzA3MC3wO/GCizA/MB+v/bSoDylrUIEWsChwKHJSAfDHwJ3GPXnwK2BP4sSEYuWbMSsQBwBnCkAXsbcDbwKbAHcKFdfwtYFTgEuKIQCbllzUbEMsDjwHIG7J7ALQnIVwMHRtfWBl4tQEQJWbMQsSzwPLCogborcOcIgKURR9j19wER8UNmIkrJ6k7EwsBLkSacZh77KHxjIi63feTvjESUlNWVCHnp1wL7GZjaC7T2j5rl6nsXsKP13Q24IyMJpWV1JWIb4KEIzB2AezvAlbn6QkSUliUtT7laaVndiJjH9gWZf2rvAqsDv3cguwnwTNRXRPyciYUaZHUjYnvgvgjIvYCbO4DVsnBVZDGdC5yQiQQ9pgZZXYhI13s5adKGrzrAXQF4b5JL2ND81CKrCxGLA59HiN0KSCP+6kDxHOB4+0wbec79oRZZXYiI13vhO25ZWgd4JSJIG7S0J9f+UIusLkTsDdwQgdvlIctul7etDV2aoLDCxRYCyeU/1CKrCxHyARRHCm0UEXMAt0d+g/YRed5Be5YGXragn2JPXq0WWV2ISGdZGleaG7jIgnoHACea/yCwVwK+Bp4GPgAEVAiPe5BRi6wuRGiNfz1CTbN9F5vh+kzBPgX/FHPS/iDA1dRvX+A8e0+xHvCdB/rRPWuR1YWI2YBHek5/iBiFNFYB3k7AFiEiQSER71aLrC5ECLxFgBuBbRMkHwSOBt6x69oLPon6PAfsBHzhzUB0/xpkdSMijFNBPllHCm0I8Ni/CH2WAPQOQOB/DOSymFKuS8rqTkTGif2vflQjohL6GhGNiEoQqESMphGNiEoQqESMphGNiEoQqESMphGNiEoQqESMphGNiEoQqESMphGNiEoQqESMphGNiEoQqESMphH/JyJCcqLe1C1mJzXWBda3c6c/VgJGSTGyaIRObShHLm19RzFLApP72VmIWBJY0IqsXBaNsGSyYm6g+56XhYggRHp0plSyYh8oJT7PSoQyRpU5qjYujasEEKWfmY0I5SHoPKxO96ldaUcuSx2dKQ18+vxsRMhi0qGykOKbO1mxNuCLEZHmISyfOVmxEWEInAScaT/3JTbWDpqHfFmWJuVCKCFlUxtBmvQuh0/mrSrA/FZRRZoU8OCYKgtVTRV1fh2IlSxEpAeNtwYetTOxhwMiJm7pQeWBxjrt2+hMrBJoTh5xBx2olm80U0KyEBGnz+rIvZJRdOg4zqEYhdJawGvThm/mfyhH9AJgd7uVKuncZKa3ZFPqgZrSlvcZk6w5GUmyEBFnjSqfWoMLAB8DSANkTemzUL1GwqtKgfIo/pjMSAbuE1ci0OTR7/HE2cwqgOqxyv9TwotOsk+3uROh0g7PWsKihFTKlpYm5SSormzIk9BnSrVVWaBg4goAeeO5q5ipHsjdhqhk2CjKagpAxwVcdE2JNXF27FQJcSeiKyNo1OAkfDzAEkSk6cZhP0uB1VJ0vV0cIiXZnQjlxF1nS1Goy7EV8NiIKSPvW3WdNohmY06NiAuz9K39sgSl0bKgpPEz1VpXItLSOxpcXx51vJ/k1ojY15GsqwGeqcXxXHQlIi1E1bepTbVKzFTX4XH9tWe9Ge1PQ1hCU5HPlYgNbakJAo2rXqY+6fp8LHD+VEYzg75p4vu42lIzeEznn7oSoVI/sr1D64svnWXJ76H/ylbnyWPg6T1jI0GaKz8h5H/neL4bEcpffjIKa8gn2HlMDde0VFDfXjIkOCoALOMhhGBy700aixsRSyUJ6+PC3um7Cs1IbZRx/vWQwKf3Sq0lFf6VZZfTkXQjYjvgfhtxXw0mmYEKCoY2rqyQByEpESU8ejci4vVeYe+uGn2pN60l6agZxm2mSpZ8AhWBDF9YMpmlSfEnBQNlgAzxltGFiNQM7XotqtD3w5EDJxIUzSxRCzwNWXR51CL5ICuVrcjxJVNlvaO/CxErJtbOqGMzCo0r2KdZpXacmapDzK7pYKONWqWJQtPhho2TfU5+kaxAjUeaIPCGkteFCJV1jk0/FTrRoQG9SFnIfg4F2bUMyJpSmKBkk8EgjUwr+Mvb1hdeKewiv0ZNmnDpgCS4Wk1rWOnpcGojBflFq5z/wJhasLmJERn7j/mWMZ1MPB14w0EwF42I5ZRFog1Z9fpUuewn4DPgG4fBDHXLeQEtr/qSEZmwOWR2J2IocP7r92lEVMJwI6IRUQkClYjRNKIRUQkClYjRqRGKu+jfh+3be7NQNQHv9n3WWXDvf0gjoh+jLD0aEVlg7n/IPwI85nNhaVjNAAAAAElFTkSuQmCC\" alt=\"MathML (base64):PG1hdGg+CiAgICA8bWZlbmNlZCBvcGVuPSJ8IiBjbG9zZT0ifCI+CiAgICAgICAgPG10YWJsZT4KICAgICAgICAgICAgPG10cj4KICAgICAgICAgICAgICAgIDxtdGQ+CiAgICAgICAgICAgICAgICAgICAgPG1pPmE8L21pPgogICAgICAgICAgICAgICAgPC9tdGQ+CiAgICAgICAgICAgICAgICA8bXRkPgogICAgICAgICAgICAgICAgICAgIDxtcm93PgogICAgICAgICAgICAgICAgICAgICAgICA8bWk+YTwvbWk+CiAgICAgICAgICAgICAgICAgICAgPC9tcm93PgogICAgICAgICAgICAgICAgPC9tdGQ+CiAgICAgICAgICAgIDwvbXRyPgogICAgICAgICAgICA8bXRyPgogICAgICAgICAgICAgICAgPG10ZD4KICAgICAgICAgICAgICAgICAgICA8bXJvdz4KICAgICAgICAgICAgICAgICAgICAgICAgPG1pPmI8L21pPgogICAgICAgICAgICAgICAgICAgIDwvbXJvdz4KICAgICAgICAgICAgICAgIDwvbXRkPgogICAgICAgICAgICAgICAgPG10ZD4KICAgICAgICAgICAgICAgICAgICA8bXJvdz4KICAgICAgICAgICAgICAgICAgICAgICAgPG1yb3c+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bWk+YzwvbWk+CiAgICAgICAgICAgICAgICAgICAgICAgIDwvbXJvdz4KICAgICAgICAgICAgICAgICAgICA8L21yb3c+CiAgICAgICAgICAgICAgICA8L210ZD4KICAgICAgICAgICAgPC9tdHI+CiAgICAgICAgPC9tdGFibGU+CiAgICA8L21mZW5jZWQ+CjwvbWF0aD4=\" /></p>",
                        "_id": "5a4d8897811a755e263b7ed8"
                    },
                    {
                        "isImage": false,
                        "optionId": 2,
                        "optionImageUrl": "",
                        "optionText": "<p>$\\begin{vmatrix}c&nbsp;&amp; a \\\\ b &amp; c\\end{vmatrix}$</p>",
                        "_id": "5a4d8897811a755e263b7ed7"
                    },
                    {
                        "isImage": false,
                        "optionId": 3,
                        "optionImageUrl": "",
                        "optionText": "<p>$\\begin{vmatrix}c&nbsp;&amp; d&nbsp;\\\\ b &amp; c\\end{vmatrix}$</p>",
                        "_id": "5a4d8897811a755e263b7ed6"
                    },
                    {
                        "isImage": false,
                        "optionId": 4,
                        "optionImageUrl": "",
                        "optionText": "<p>$\\begin{vmatrix}a&nbsp;&amp; d&nbsp;\\\\ b &amp; c\\end{vmatrix}$</p>",
                        "_id": "5a4d8897811a755e263b7ed5"
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4d8921811a755e263b7eda",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "No hint available for this item",
                "questionsText": "<p>The nature of cohesive forces in water is</p>",
                "options": [
                    {
                        "isImage": false,
                        "optionId": 1,
                        "optionImageUrl": "",
                        "optionText": "<p>0.3</p>",
                        "_id": "5a4d8921811a755e263b7ee0"
                    },
                    {
                        "isImage": false,
                        "optionId": 2,
                        "optionImageUrl": "",
                        "optionText": "<p>45</p>",
                        "_id": "5a4d8921811a755e263b7edf"
                    },
                    {
                        "isImage": false,
                        "optionId": 3,
                        "optionImageUrl": "",
                        "optionText": "<p>3.4</p>",
                        "_id": "5a4d8921811a755e263b7ede"
                    },
                    {
                        "isImage": false,
                        "optionId": 4,
                        "optionImageUrl": "",
                        "optionText": "<p>2.4</p>",
                        "_id": "5a4d8921811a755e263b7edd"
                    }
                ],
                "referenceMedia": null,
                "questionImage": [
                    {
                        "caption": "Eq : 1",
                        "imageUrl": "https://bloom-foundation-dev.s3.amazonaws.com/20180104_1.gif",
                        "_id": "5a4d8921811a755e263b7edc"
                    }
                ]
            },
            {
                "_id": "5a4d8dd6a6997e5ea1333af5",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "No hint available for this item",
                "questionsText": "<p>Of the following crystal lattices, the one that has the largest packing fraction</p>",
                "options": [
                    {
                        "_id": "5a4d8dd6a6997e5ea1333afa",
                        "optionText": "<p>bcc</p>",
                        "optionImageUrl": "",
                        "optionId": 1,
                        "isImage": false
                    },
                    {
                        "_id": "5a4d8dd6a6997e5ea1333af9",
                        "optionText": "<p>fcc</p>",
                        "optionImageUrl": "",
                        "optionId": 2,
                        "isImage": false
                    },
                    {
                        "_id": "5a4d8dd6a6997e5ea1333af8",
                        "optionText": "<p>simple cubic</p>",
                        "optionImageUrl": "",
                        "optionId": 3,
                        "isImage": false
                    },
                    {
                        "_id": "5a4d8dd6a6997e5ea1333af7",
                        "optionText": "<p>simple tetragonal</p>",
                        "optionImageUrl": "",
                        "optionId": 4,
                        "isImage": false
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4dc80b6d662f0004f58fbb",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "This question is not having hint. no solution",
                "questionsText": "<p>This question is not having solution</p>",
                "options": [
                    {
                        "isImage": false,
                        "optionId": 1,
                        "optionImageUrl": "",
                        "optionText": "<p>op1</p>",
                        "_id": "5a4dc80b6d662f0004f58fc0"
                    },
                    {
                        "isImage": false,
                        "optionId": 2,
                        "optionImageUrl": "",
                        "optionText": "<p>op2</p>",
                        "_id": "5a4dc80b6d662f0004f58fbf"
                    },
                    {
                        "isImage": false,
                        "optionId": 3,
                        "optionImageUrl": "",
                        "optionText": "<p>op3</p>",
                        "_id": "5a4dc80b6d662f0004f58fbe"
                    },
                    {
                        "isImage": false,
                        "optionId": 4,
                        "optionImageUrl": "",
                        "optionText": "<p>op4</p>",
                        "_id": "5a4dc80b6d662f0004f58fbd"
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4dc9ea3b9aa0669643d4c5",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "see solution",
                "questionsText": "<p>solution</p>",
                "options": [
                    {
                        "_id": "5a4dc9ea3b9aa0669643d4ca",
                        "optionText": "<p>1</p>",
                        "optionImageUrl": "",
                        "optionId": 1,
                        "isImage": false
                    },
                    {
                        "_id": "5a4dc9ea3b9aa0669643d4c9",
                        "optionText": "<p>2</p>",
                        "optionImageUrl": "",
                        "optionId": 2,
                        "isImage": false
                    },
                    {
                        "_id": "5a4dc9ea3b9aa0669643d4c8",
                        "optionText": "<p>3</p>",
                        "optionImageUrl": "",
                        "optionId": 3,
                        "isImage": false
                    },
                    {
                        "_id": "5a4dc9ea3b9aa0669643d4c7",
                        "optionText": "<p>4</p>",
                        "optionImageUrl": "",
                        "optionId": 4,
                        "isImage": false
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4dcaa63b9aa0669643d4cc",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "See solution ",
                "questionsText": "<p>This question is having <strong>solution text </strong>only</p>",
                "options": [
                    {
                        "isImage": false,
                        "optionId": 1,
                        "optionImageUrl": "",
                        "optionText": "<p>$x=y^2-4ac$</p>",
                        "_id": "5a4dcaa63b9aa0669643d4d1"
                    },
                    {
                        "isImage": false,
                        "optionId": 2,
                        "optionImageUrl": "",
                        "optionText": "<p>$x=y^2-4ab$</p>",
                        "_id": "5a4dcaa63b9aa0669643d4d0"
                    },
                    {
                        "isImage": false,
                        "optionId": 3,
                        "optionImageUrl": "",
                        "optionText": "<p>$x=y^2-4rc$</p>",
                        "_id": "5a4dcaa63b9aa0669643d4cf"
                    },
                    {
                        "isImage": false,
                        "optionId": 4,
                        "optionImageUrl": "",
                        "optionText": "<p>$x=y^2-4acb$</p>",
                        "_id": "5a4dcaa63b9aa0669643d4ce"
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4dcae13b9aa0669643d4d3",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 4,
                "questionHint": "See solution ",
                "questionsText": "X-<p>This question is having solution <strong>text </strong>and <strong>image </strong>both</p>-1515047885263",
                "options": [
                    {
                        "_id": "5a4dcae13b9aa0669643d4d8",
                        "optionText": "<p>$x=y^2-4ac$</p>",
                        "optionImageUrl": "",
                        "optionId": 1,
                        "isImage": false
                    },
                    {
                        "_id": "5a4dcae13b9aa0669643d4d7",
                        "optionText": "<p>$x=y^2-4ab$</p>",
                        "optionImageUrl": "",
                        "optionId": 2,
                        "isImage": false
                    },
                    {
                        "_id": "5a4dcae13b9aa0669643d4d6",
                        "optionText": "<p>$x=y^2-4rc$</p>",
                        "optionImageUrl": "",
                        "optionId": 3,
                        "isImage": false
                    },
                    {
                        "_id": "5a4dcae13b9aa0669643d4d5",
                        "optionText": "<p>$x=y^2-4acb$</p>",
                        "optionImageUrl": "",
                        "optionId": 4,
                        "isImage": false
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            },
            {
                "_id": "5a4e582341793d0004aad32b",
                "questionType": "CHOICE_SINGLE",
                "numberOfOptions": 2,
                "questionHint": "No hint available for this question",
                "questionsText": "<p>sol</p>",
                "options": [
                    {
                        "isImage": false,
                        "optionId": 1,
                        "optionImageUrl": "",
                        "optionText": "<p>45</p>",
                        "_id": "5a4e582341793d0004aad32e"
                    },
                    {
                        "isImage": false,
                        "optionId": 2,
                        "optionImageUrl": "",
                        "optionText": "<p>12</p>",
                        "_id": "5a4e582341793d0004aad32d"
                    }
                ],
                "referenceMedia": null,
                "questionImage": []
            }
        ],
        "pagination": {},
        "error": {}
        }
     */

    app.get('/api/tests/:testId/start', function (req, res) {
        var out;
        var b = req.body;
        b.testId = req.params.testId;
        b.userId = req.headers.userid;
        var userDetail = {};
        var testDetail = {};
        var testReferenceId = U.generateRandomToken();
        // console.log("data from input", b);

        //  1. Validate whether testId exist or not - done
        //  2. Check whether current date is in between start and end test - done
        //  3. Check whether user belongs to test's segment and subsegment - done
        //  4. Store test detail to local variable - done
        var getTestDetail = function (testId) {
            var defer = Q.defer();
            var query = Test.find({
                _id: testId,
                isDeleted: false,
                isActive: true,
            }, {
                    unitDistribution: 1,
                    startDate: 1,
                    endDate: 1,
                    duration: 1,
                    subject: 1,
                    testName: 1
                })
                .lean()
                .where('segments').in([Mongoose.Types.ObjectId(userDetail.segment)])
                .where('subSegments').in([Mongoose.Types.ObjectId(userDetail.subSegment)]);

            query.exec(function (err, testData) {
                if (!err) {
                    if (!testData || testData.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this test doesn't exist anymore or user may not be eligible for this", b);
                        defer.reject(out);
                    } else {
                        try {
                            testDetail = testData[0];
                            console.log("start date : " + testDetail.startDate);
                            console.log("end date : " + testDetail.endDate);
                            var isValid = moment().isBetween(testDetail.startDate, testDetail.endDate);
                            if (isValid)
                                defer.resolve();
                            else {
                                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this test is already expired", b);
                                defer.reject(out);
                            }
                        } catch (e) {
                            console.error("Possible error from moment while comparing start date and end date of test. %j", e);
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this test is already expired", b);
                            defer.reject(out);
                        }
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }

        //  1. Iterate units - done
        //  2. Iterate question type- done
        //  3. Iterate levels- done
        //  4. Create promise based on unitId, questionType, levelId, subSegment and userId(to calculate question to exclude)- done
        //  5. Execute all the promises at once- done
        //  6. Once execution confirms check if total number of question received are same as defined in the testDetail - done
        //  7. Return response- done
        var getTestQuestions = function (userId, segmentId, subSegmentId, testUnits) {
            var d = Q.defer();
            var promise = [];
            var questions = [];
            var questionIdsToExclude = [];
            _.each(testUnits, function (unit) {
                var unitId = unit.unitId;
                _.each(unit.questionDistribution, function (q) {
                    var questionType = q.questionType;
                    _.each(q.level, function (level) {
                        // console.log("Adding : unit : " + unitId + " type : " + questionType + "level :" + level.difficultyLevel);
                        promise.push(getQuestion(userId, segmentId, subSegmentId, unitId, questionType, level.difficultyLevel, level.noOfQuestions));
                    })
                })
            })
            log("Question Promise ready for execution", promise.length);

            // var result = Q(questionIdsToExclude);
            // promise.forEach(function (f) {
            //     result = result.then(f);
            // });
            // return result
            // var result = Q("initialVal");
            // promise.forEach(function (f) {
            //     result = result.then(f);
            // });
            // d.resolve(result);
            Q.allSettled(promise)
                .then(function (results) {
                    var success = 0;
                    var failed = 0;
                    results.forEach(function (result) {
                        if (result.state === "fulfilled") {
                            questions = questions.concat(result.value);
                            success++;
                        } else {
                            var reason = result.reason;
                            failed++;
                            // log("promise Failed", reason);
                        }
                    });
                    log("Question list ready with", questions.length);
                    console.log("success : " + success + " failed : " + failed);
                    d.resolve(questions);
                })
            return d.promise;
        }
        function log(s, v) {
            console.log(s + " : %j", v);
        }
        var getQuestion = function (userId, segmentId, subSegmentId, unitId, questionType, level, noOfQuestion) {
            var d = Q.defer();
            var input = {};
            // input.userId = userId;
            // input.segmentId = segmentId;
            // input.subSegmentId = subSegmentId;
            input.unitId = unitId;
            input.questionType = questionType;
            // input.level = level;
            input.noOfQuestion = noOfQuestion;
            Question.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        questionType: questionType,
                        "segments": segmentId,
                        "subSegments.subSegmentId": subSegmentId,
                        "subSegments.difficultyLevel": level,
                        "units": unitId
                    },
                },
                {
                    $sample: { size: noOfQuestion }
                }, {
                    $project: {
                        _id: 1,
                        numberOfOptions: 1,
                        questionHint: 1,
                        questionsText: 1,
                        options: 1,
                        answer: 1,
                        referenceMedia: 1,
                        questionImage: 1,
                        questionType: 1,
                        units: 1,
                        subSegments: 1,
                        questionMatrix: 1,
                        optionMatrix: 1
                    }
                }
            ], function (err, questions) {
                if (!err) {
                    if (!questions || questions.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems no question available for this combination", input);
                        d.reject(input);
                    } else {
                        // questions[0].input = input;
                        d.resolve(questions);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    d.reject(out);
                }
            })
            return d.promise;
        }
        //  1. Save the details that user has started the test - done
        //  2. It will store test id with all questions against user id - done
        //  3. It will also store start time - done
        //  4. All stored question will be marked as unknown state initially and would be updated to correct/incorrect during end test - done
        //  5. It will accept params-> userId, testId, questions, startTime
        //  6. Update test collection so that user can not start test again
        var saveTestActivity = function () {
            var defer = Q.defer();
            var testSummary = new TestSummary();
            testSummary.userId = b.userId;
            testSummary.testId = b.testId;
            testSummary.subjectId = testDetail.subject;
            testSummary.testReferenceId = testReferenceId;
            testSummary.startTime = U.getTimeStamp();
            for (var i = 0; i < b.questions.length; i++) {
                testSummary.questions.push(
                    {
                        questionId: b.questions[i]._id,
                        answer: b.questions[i].answer,
                        questionType: b.questions[i].questionType
                        // level: b.questions[i].level
                    }
                );
                delete b.questions[i].answer;
            }
            testSummary.save(function (err, data) {
                if (!err) {
                    if (data != null) {
                        b.practiceId = data._id;
                        defer.resolve();
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Error in saving test', b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };

        var updateTestWithUserId = function (testId, userId) {
            var defer = Q.defer();
            Test.updateOne({
                _id: Mongoose.Types.ObjectId(testId)
            }, {
                    $addToSet: {
                        "users": Mongoose.Types.ObjectId(userId)
                    }
                }, function (err, data) {
                    if (err)
                        log("Error while storing user Id in test", err);
                    defer.resolve();
                });
            return defer.promise;
        };

        J.verifyUser(b.userId)
            .then(function (user) {
                userDetail = user;
                return getTestDetail(b.testId);
            })
            .then(function () {
                return getTestQuestions(b.userId, userDetail.segment, userDetail.subSegment, testDetail.unitDistribution);
                // return getQuestion(b.userId, '5a1cc1fb5c04d814344ad59c', 'CHOICE_SINGLE', 2)
            })
            .then(function (data) {
                questions = data;
                if (questions != null && questions.length > 0) {
                    b.questions = questions;
                    updateTestWithUserId(b.testId, b.userId);
                    return saveTestActivity();
                } else {
                    var defer = Q.defer();
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No questions found', b);
                    defer.reject(out);
                    return defer.promise;
                }
            })
            // .then(function () {
            //     return saveTestActivity();
            // })
            .then(function () {
                var response = {};
                delete testDetail.unitDistribution;
                testDetail.numberOfQuestions = questions.length;
                response.testDetail = testDetail;
                // response.questionLength = questions.length;
                // response.questionIds = questions.map(function (q) { return q._id; });
                // response.questions = questions.map(function (q) { return { "id": q._id, "que": q.questionsText, 'type:': q.questionType, "units": q.units, "segments": q.segments, "subSegments": q.subSegments }; });
                response.questions = questions;

                out = U.getJson(C.STATUS_SUCCESS_CODE, testReferenceId, response);
                res.json(out);
            })
            .fail(function (out) {
                if (!out) {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b);
                }
                res.json(out);
            })
    })

    /**
     * @api {post} /api/tests/:testId/end End Test
     * @apiName End Test
     * @apiDescription End Test if already started
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} testId . (in path) test Id to End
     * @apiParam {string} testReferenceId . (in body) test reference Id to End
     * @apiParam {string} answer (in body) - ['questionId':'5a4d87cd811a755e263b7ec5':'selectedOptions':[{"optionId": 3,"mappedTo": ""}]]
     */
    app.post('/api/tests/:testId/end', function (req, res) {
        var out;
        var b = req.body;
        b.testId = req.params.testId;
        b.userId = req.headers.userid;
        var testDetail = {};
        var calculatedQuestion = [];
        var skipCount = 0;
        var incorrectCount = 0;
        var correctCount = 0;
        // console.log("data from end test", b);

        //  1. Check whether test id exist - done
        //  2. Check whether test reference id exist (to ensure the same user has started the test) - done
        //  3. Check whether test status is in progress - done
        //  4. Store test detail to local variable - done
        var getTestDetail = function () {
            var defer = Q.defer();
            var query = TestSummary.find({
                testId: b.testId,
                testReferenceId: b.testReferenceId,
            });
            query.lean();
            query.populate('testId', 'passingCutOff marks resultRules')
            query.exec(function (err, testData) {
                if (!err) {
                    if (!testData || testData.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this test doesn't exist anymore or user may not be eligible for this", b);
                        defer.reject(out);
                    } else {
                        testDetail = testData[0];
                        defer.resolve();
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }

        var validateAnswer = function (originalQuestion, userAnswer) {
            var d = Q.defer();
            try {
                _.each(originalQuestion, function (o) {
                    //  Find question by id
                    var matchedQuestion = _.find(userAnswer, function (u) {
                        return o.questionId == u.questionId;
                    })
                    //  Check the answer now
                    if (!matchedQuestion || !matchedQuestion.selectedOptions || matchedQuestion.selectedOptions.length == 0) {
                        //  This question has been skipped
                        calculatedQuestion.push({
                            'questionId': o.questionId,
                            "questionType": o.questionType,
                            "_id": o._id,
                            "isCorrect": false,
                            "selectedOptions": [],
                            "answer": o.answer,
                            "status": "skipped",
                            "level": o.level
                        })
                        skipCount++;
                    }
                    else if (matchedQuestion.selectedOptions.length != o.answer.length) {
                        //  All provided answer option is not correct
                        calculatedQuestion.push({
                            'questionId': matchedQuestion.questionId,
                            "questionType": o.questionType,
                            "_id": o._id,
                            "isCorrect": false,
                            "answer": o.answer,
                            "selectedOptions": matchedQuestion.selectedOptions,
                            "status": "incorrect",
                            "level": o.level
                        });
                        incorrectCount++;
                    }
                    else {
                        var isCorrect = false;
                        var isMatch;
                        for (var i = 0; i < o.answer.length; i++) {
                            var actualAnswer = o.answer[i];
                            isMatch = _.find(matchedQuestion.selectedOptions, function (guessedAnswer) {
                                return actualAnswer.optionId == guessedAnswer.optionId;
                            })
                            if (isMatch === undefined)
                                isCorrect = false;
                            else isMatch = true;
                            if (!isCorrect) {
                                //  At least one of the guessed option doesn't match. exit
                                break;
                            }
                        }
                        if (isCorrect)
                            correctCount++;
                        else incorrectCount++;
                        calculatedQuestion.push({
                            'questionId': matchedQuestion.questionId,
                            "questionType": o.questionType,
                            "_id": o._id,
                            "answer": o.answer,
                            "isCorrect": isCorrect,
                            "selectedOptions": matchedQuestion.selectedOptions,
                            "status": isCorrect ? 'correct' : 'incorrect',
                            "level": o.level
                        })
                    }
                })
                d.resolve(calculatedQuestion);
            } catch (e) {
                d.reject(e);
            }
            return d.promise;
        }
        //  Save the details that test has been completed
        //  Update summary
        //  Update end time
        //  Update time spent
        var updateTestSummary = function (calculatedQuestion) {
            var defer = Q.defer();
            var endTime = U.getTimeStamp();
            var summary = {};
            summary.score = correctCount + "/" + calculatedQuestion.length;
            summary.totalQuestion = calculatedQuestion.length;
            summary.correctCount = correctCount;
            summary.incorrectCount = incorrectCount;
            summary.skipCount = skipCount;

            //  Divide by zero check
            if (correctCount + incorrectCount != 0)
                summary.accuracy = Math.round((correctCount * 100) / (correctCount + incorrectCount));
            else
                summary.accuracy = 0;
            summary.timeSpent = Math.ceil(((endTime - testDetail.startTime) / (60 * 1000)));
            summary.skillEarned = (correctCount + incorrectCount) * 100 / calculatedQuestion.length;
            summary.score = Math.round((correctCount * 100) / calculatedQuestion.length);
            if (summary.score > testDetail.testId.passingCutOff) {
                summary.result = "Pass";
            } else {
                summary.result = "Fail";
            }

            for (var r = 0; r < testDetail.testId.resultRules.length; r++) {
                var rule = testDetail.testId.resultRules[r];
                if (summary.score >= rule.lowerLimit && summary.score < rule.upperLimit) {
                    summary.description = "<strong> " + rule.message + " </strong > ";
                    summary.bannerUrl = "https://bloom-foundation-dev.s3.amazonaws.com/20180104T000000Z_logo%20%281%29.jpg";
                    summary.bannerLink = "http://arihantbooks.com/";
                    break;
                }
            }


            TestSummary.findByIdAndUpdate({ _id: testDetail._id },
                { $set: { "summary": summary, "testStatus": "completed", "endTime": endTime, 'questions': calculatedQuestion } },
                { new: true, lean: true },
                function (err, updatedData) {
                    if (!err) {
                        if (updatedData != null) {
                            defer.resolve(updatedData);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Error in saving test summary', b, err);
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
                userDetail = user;
                return getTestDetail();
            })
            .then(function () {
                try {
                    if (b.answer && b.answer != "[]") {
                        var userAnswer = JSON.parse(b.answer);
                        // validate answer format
                        if (!userAnswer || userAnswer.length == 0 || !userAnswer[0].selectedOptions || userAnswer[0].selectedOptions.length == 0) {
                            var d = Q.defer();
                            var out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Answer format is wrong.", b);
                            d.reject(out);
                            return d.promise;
                        } else
                            return validateAnswer(testDetail.questions, userAnswer);
                    }
                    else {
                        console.log("Answer not available.");
                        return validateAnswer(testDetail.questions, null);
                    }
                } catch (e) {
                    var d = Q.defer();
                    console.log("Failed to parse user provided answer");
                    var out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Failed to parse user provided answer", b, e);
                    d.reject(out);
                    return d.promise;
                }

            })
            .then(function (calculatedQuestion) {
                return updateTestSummary(calculatedQuestion);
            })
            .then(function (response) {
                var out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, response);
                res.json(out);
            })
            // .then(function () {
            //     // var response = {};
            //     // response.testDetail = testDetail;
            //     // response.questions = b.questions;
            //     out = U.getJson(C.STATUS_SUCCESS_CODE, testDetail);
            //     res.json(out);
            // })
            .fail(function (out) {
                if (!out) {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b);
                }
                res.json(out);
            })
    })
}