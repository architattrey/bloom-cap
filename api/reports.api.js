
var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var Resource = require('./../models/resources.model');
var Subject = require('./../models/subjects.model');
var Student = require('./../models/student1.model');
var Question = require('./../models/questions.model');
var Video = require('./../models/videos.model');
var Practice = require('./../models/practice.model');
var TestSummary = require('./../models/testSummary.model');
var Test = require('./../models/tests.model');

module.exports = function (app) {


    /**
       * @api {get} /api/admin/reports/questionCountBySubject
       * @apiName Get question count
       * @apiDescription Get question count by subject
       * @apiGroup Resources
       * @apiParam {string} userId . In Header
       * @apiParam {string} authToken . In Header
       * @apiParam {string} apiKey . In Header
       * @apiParam {string} version . In Header
       * @apiParam {string} fromDate . In query
       * @apiParam {string} toDate . In query
       * @apiParam {string} segmentIds . In query - Pipe separated ids
       */
    app.get('/api/admin/reports/questionCountBySubject2', function (req, res) {
        var out;
        var b = req.query;
        // b.fromDate = req.query.fromDate == undefined ? '' : req.query.fromDate;
        // b.toDate = req.query.toDate == undefined ? '' : req.query.toDate;

        var query = Question.aggregate(
            {
                $match: { "isDeleted": false }
            });
        if (b.fromDate)
            query.append({
                $match: { "createdAt": { $gte: new Date(b.fromDate) } }
            });
        if (b.toDate)
            query.append({
                $match: { "createdAt": { $lte: new Date(b.toDate) } }
            });
        if (b.segmentIds && b.segmentIds.length > 0) {
            var segments = b.segmentIds.split("|");
            query.append({
                $in: [Mongoose.Types.ObjectId(b.segmentIds), "$segments"]
            })
        }

        query.append({
            $group: {
                _id: "$subject",
                totalCount: { $sum: 1 },
                //    	data:{$push:"$$ROOT"}
                activeCount: { $sum: { $cond: ["$isActive", 1, 0] } },
                inActiveCount: { $sum: { $cond: ["$isActive", 0, 1] } }
            }
        }
            , {
                $lookup: {
                    from: "subjects",
                    localField: "_id",
                    foreignField: "_id",
                    as: "subject"
                }
            },
            {
                $match: { "subject.isActive": true }
            },
            {
                $project: {
                    //		subjectId:"$_id",
                    name: "$subject.name",
                    totalCount: "$totalCount",
                    activeCount: "$activeCount",
                    inActiveCount: "$inActiveCount",
                    _id: 1
                }
            }, {
                $unwind: "$name"
            }
        )


        var getAllItems = function (itemCount) {
            var d = Q.defer();
            // console.log("query : " + JSON.stringify(query));
            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            })
            return d.promise;
        };
        getAllItems()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    app.get('/api/admin/reports/questions/reports/bySubject', function (req, res) {
        var out;
        var b = req.query;

        var query = Question.aggregate(
            {
                $match: { "isDeleted": false }
            });
        if (b.fromDate)
            query.match({
                "createdAt": { $gte: new Date(b.fromDate) }
            });
        if (b.toDate)
            query.match({
                "createdAt": {
                    $lte: new Date(b.toDate)
                }
            });
        var segmentFilter = U.getFilter(req.query, "segmentIds", true);
        if (segmentFilter && segmentFilter.length > 0)
            query.match({ "segments": { $in: segmentFilter } });

        var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
        if (subSegmentFilter && subSegmentFilter.length > 0)
            query.match({ "subSegments.subSegmentId": { $in: subSegmentFilter } });

        var subjectFilter = U.getFilter(req.query, "subjectId");
        if (subjectFilter.subjectId && subjectFilter.subjectId != "")
            query.match({ "subject": subjectFilter.subjectId });

        query.group({
            _id: "$subject",
            totalCount: { $sum: 1 },
            //    	data:{$push:"$$ROOT"}
            activeCount: { $sum: { $cond: ["$isActive", 1, 0] } },
            inActiveCount: { $sum: { $cond: ["$isActive", 0, 1] } }
        });
        query.lookup({
            from: "subjects",
            localField: "_id",
            foreignField: "_id",
            as: "subject"
        });

        query.match({ "subject.isActive": true });

        query.project({
            //		subjectId:"$_id",
            name: "$subject.name",
            totalCount: "$totalCount",
            activeCount: "$activeCount",
            inActiveCount: "$inActiveCount",
            _id: 1
        });
        query.unwind("$name");

        var getAllItems = function (itemCount) {
            var d = Q.defer();
            // console.log("query : " + JSON.stringify(query));
            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            })
            return d.promise;
        };
        getAllItems()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
      * @api {get} /api/admin/reports/students/statistics
      * @apiName Get student report
      * @apiDescription Get student report
      * @apiGroup Reports
      * @apiParam {string} userId . In Header
      * @apiParam {string} authToken . In Header
      * @apiParam {string} apiKey . In Header
      */
    app.get('/api/admin/reports/students/statistics', function (req, res) {
        var out;
        var b = req.params;

        var getMaxVideoWatched = function () {
            var d = Q.defer();
            Video.aggregate([{
                $unwind: "$userIds"
            }, {
                $group: {
                    _id: "$userIds",
                    count: { $sum: 1 }
                }
            }, {
                "$sort": { "count": -1 }
            }, {
                $lookup: {
                    from: "students1",
                    localField: "_id",
                    foreignField: "_id",
                    as: "student"
                }
            }, {
                $project: {
                    userId: "$_id",
                    _id: 0,
                    count: "$count",
                    student: { "$arrayElemAt": ["$student", 0] }
                }
            }, {
                $project: {
                    userId: "$userId",
                    count: "$count",
                    name: "$student.name",
                    email: "$student.email",
                    studentMobileNo: "$student.studentMobileNo",
                    createdAt: "$student.createdAt",
                    profileImage: "$student.profileImage",
                    gender: "$student.gender",
                }
            }]).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var getMaxPracticePerformed = function () {
            var d = Q.defer();
            Practice.aggregate([{
                $group: {
                    _id: "$userId",
                    count: { $sum: 1 }
                }
            }, {
                "$sort": { "count": -1 }
            }, {
                $lookup: {
                    from: "students1",
                    localField: "_id",
                    foreignField: "_id",
                    as: "student"
                }
            }, {
                $project: {
                    userId: "$_id",
                    _id: 0,
                    count: "$count",
                    student: { "$arrayElemAt": ["$student", 0] }
                }
            }, {
                $project: {
                    userId: "$userId",
                    count: "$count",
                    name: "$student.name",
                    email: "$student.email",
                    studentMobileNo: "$student.studentMobileNo",
                    createdAt: "$student.createdAt",
                    profileImage: "$student.profileImage",
                    gender: "$student.gender",
                }
            }]).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var getMaxTestsPerformed = function () {
            var d = Q.defer();
            TestSummary.aggregate([{
                $group: {
                    _id: "$userId",
                    count: { $sum: 1 }
                }
            }, {
                "$sort": { "count": -1 }
            }, {
                $lookup: {
                    from: "students1",
                    localField: "_id",
                    foreignField: "_id",
                    as: "student"
                }
            }, {
                $project: {
                    userId: "$_id",
                    _id: 0,
                    count: "$count",
                    student: { "$arrayElemAt": ["$student", 0] }
                }
            }, {
                $project: {
                    userId: "$userId",
                    count: "$count",
                    name: "$student.name",
                    email: "$student.email",
                    studentMobileNo: "$student.studentMobileNo",
                    createdAt: "$student.createdAt",
                    profileImage: "$student.profileImage",
                    gender: "$student.gender",
                }
            }]).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var getNoPracticePerformed = function () {
            var d = Q.defer();
            Student.aggregate([
                {
                    $lookup: {
                        from: "practices",
                        localField: "_id",
                        foreignField: "userId",
                        as: "practices"
                    }
                }, {
                    $project: {
                        name: "$name",
                        email: "$email",
                        studentMobileNo: "$studentMobileNo",
                        createdAt: "$createdAt",
                        profileImage: "$profileImage",
                        gender: "$gender",
                        count: { $size: "$practices" }
                    }
                }, {
                    $match: {
                        count: 0
                    }
                }, {
                    $sort: {
                        createdAt: -1
                    }
                }
            ]).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var getNoTestPerformed = function () {
            var d = Q.defer();
            Student.aggregate([
                {
                    $lookup: {
                        from: "tests",
                        localField: "_id",
                        foreignField: "userId",
                        as: "tests"
                    }
                }, {
                    $project: {
                        name: "$name",
                        email: "$email",
                        studentMobileNo: "$studentMobileNo",
                        createdAt: "$createdAt",
                        profileImage: "$profileImage",
                        gender: "$gender",
                        count: { $size: "$tests" }
                    }
                }, {
                    $match: {
                        count: 0
                    }
                }, {
                    $sort: {
                        createdAt: -1
                    }
                }
            ]).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };
        // https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/index.html#unwind-example
        var data = {};
        getMaxVideoWatched()
            .then(function (out) {
                data.maxVideoWatched = out;
                return getMaxPracticePerformed();
            })
            .then(function (out) {
                data.maxPracticePerformed = out;
                return getMaxTestsPerformed();
            })
            .then(function (out) {
                data.maxTestPerformed = out;
                return getNoPracticePerformed();
            })
            .then(function (out) {
                data.noPracticePerformed = out;
                return getNoTestPerformed();
            })
            .then(function (out) {
                data.noTestPerformed = out;
                res.json(U.getJson(200, "success", data));
            })
            .fail(function (out) {
                res.json(out);
            })
    });


    /**
    * @api {get} /api/admin/reports/videos/
    * @apiName Get video report
    * @apiDescription Get video report
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */

    app.get('/api/admin/reports/videos/', function (req, res) {
        var out;
        var b = req.params;
        var pagination = U.getPagination(req.query);
        var query = Video.aggregate([{ $match: { isActive: true, isDeleted: false } }]);

        var subjectFilter = U.getFilter(req.query, "subjectId");
        var segmentFilter = U.getFilter(req.query, "segmentIds", true);
        var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
        var unitFilter = U.getFilter(req.query, "unitIds", true);
        if (subjectFilter.subjectId != "")
            query.match({ "subject": subjectFilter.subjectId });

        var getVideoReport = function () {
            var d = Q.defer();


            query.lookup({
                from: "subjects",
                localField: "subject",
                foreignField: "_id",
                as: "subjects"
            });

            query.lookup({
                from: 'topics',
                localField: 'topics',
                foreignField: '_id',
                as: 'topics'
            });
            query.project({
                createdAt: 1,
                durationToDisplay: 1,
                videoUrl: 1,
                thumbUrl: 1,
                videoType: 1,
                title: 1,
                timestamp: 1,
                watchedCount: { $size: "$userIds" },
                subjects: 1,
                topic: { $arrayElemAt: ["$topics", 0] },
            });
            query.lookup({
                from: "segments",
                localField: "topic.segments",
                foreignField: "_id",
                as: "segments"
            });
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments._id": { $in: segmentFilter } });
            query.lookup({
                from: 'subsegments',
                localField: 'topic.subSegments',
                foreignField: '_id',
                as: 'subSegments'
            });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments._id": { $in: subSegmentFilter } });
            query.lookup({
                from: "units",
                localField: "topic.units",
                foreignField: "_id",
                as: "units"
            });
            if (unitFilter && unitFilter.length > 0)
                query.match({ "units._id": { $in: unitFilter } });
            query.lookup({
                from: 'chapters',
                localField: 'topic.chapters',
                foreignField: '_id',
                as: 'chapters'
            });
            query.sort({ watchedCount: -1 });

            query.facet({
                data: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
                count: [{
                    $group: {
                        _id: null, total: { $sum: 1 }
                    }
                }]
            });

            query.exec(function (err, response) {
                if (!err) {
                    if (response == null || response.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        let data = response[0].data;
                        pagination.total = response[0].count && response[0].count.length == 1 ? response[0].count[0].total : 0;
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data, null, pagination);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        // getVideoCount()
        //     .then(function (out) {
        //         return getVideoReport();
        //     })
        getVideoReport()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
    * @api {get} /api/admin/reports/tests/statistics
    * @apiName Get test statistics
    * @apiDescription getTopAttemptedTests , getTopScoringTest
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */
    app.get('/api/admin/reports/tests/statistics', function (req, res) {
        var out;
        var b = req.params;

        var segmentFilter = U.getFilter(req.query, "segmentIds", true);
        var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
        var subjectFilter = U.getFilter(req.query, "subjectId");

        var getTopAttemptedTests = function () {
            var d = Q.defer();

            var query = TestSummary.aggregate([{ "$group": { _id: "$testId", count: { $sum: 1 } } }, { $limit: 10 }, { $sort: { count: -1 } }, { $lookup: { from: 'tests', localField: '_id', foreignField: '_id', as: 'test' } }, { $unwind: { path: "$test" } }, { $project: { testId: "$_id", count: 1, createdAt: "$test.createdAt", duration: "$test.duration", subject: "$test.subject", endDate: "$test.endDate", startDate: "$test.startDate", testName: "$test.testName", subSegment: { $arrayElemAt: ["$test.subSegments", 0] }, segment: { $arrayElemAt: ["$test.segments", 0] }, } }, { $lookup: { from: 'subjects', localField: 'subject', foreignField: '_id', as: 'subjects' } }, { $lookup: { from: 'segments', localField: 'segment', foreignField: '_id', as: 'segments' } }, { $lookup: { from: 'subsegments', localField: 'subSegment', foreignField: '_id', as: 'subSegments' } }]);

            //  Applying filter
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments._id": { $in: segmentFilter } });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments._id": { $in: subSegmentFilter } });
            if (subjectFilter.subjectId && subjectFilter.subjectId != "")
                query.match({ "subjects._id": subjectFilter.subjectId });

            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var getTopScoringTest = function () {
            var d = Q.defer();
            var query = TestSummary.aggregate([{ $match: { testStatus: "completed", "summary.score": { $ne: 0 } } }, { $limit: 10 }, { $group: { _id: "$testId", score: { $sum: "$summary.score" } } }, { $sort: { score: -1 } }, { $lookup: { from: 'tests', localField: '_id', foreignField: '_id', as: 'test' } }, { $unwind: { path: "$test" } }, { $project: { testId: "$_id", score: 1, createdAt: "$test.createdAt", duration: "$test.duration", subject: "$test.subject", endDate: "$test.endDate", startDate: "$test.startDate", testName: "$test.testName", subSegment: { $arrayElemAt: ["$test.subSegments", 0] }, segment: { $arrayElemAt: ["$test.segments", 0] }, } }, { $lookup: { from: 'subjects', localField: 'subject', foreignField: '_id', as: 'subjects' } }, { $lookup: { from: 'segments', localField: 'segment', foreignField: '_id', as: 'segments' } }, { $lookup: { from: 'subsegments', localField: 'subSegment', foreignField: '_id', as: 'subSegments' } }]);

            //  Applying filter
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments._id": { $in: segmentFilter } });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments._id": { $in: subSegmentFilter } });
            if (subjectFilter.subjectId && subjectFilter.subjectId != "")
                query.match({ "subjects._id": subjectFilter.subjectId });

            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var data = {};
        getTopAttemptedTests()
            .then(function (out) {
                data.topAttemptedTest = out;
                return getTopScoringTest();
            })
            .then(function (out) {
                data.topScoringTest = out;
                res.json(U.getJson(200, "success", data));
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
    * @api {get} /api/admin/reports/tests
    * @apiName Get test reports
    * @apiDescription get all tests and number of users who attempted it
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */
    app.get('/api/admin/reports/tests', function (req, res) {
        var out;
        var b = req.params;
        var pagination = U.getPagination(req.query);

        var query = Test.aggregate([
            {
                $match: {
                    isActive: true,
                    isDeleted: false
                }
            }, {
                $sort: { createdAt: -1 }
            }]);

        var segmentFilter = U.getFilter(req.query, "segmentIds", true);
        if (segmentFilter && segmentFilter.length > 0)
            query.match({ "segments": { $in: segmentFilter } });

        var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
        if (subSegmentFilter && subSegmentFilter.length > 0)
            query.match({ "subSegments": { $in: subSegmentFilter } });

        var subjectFilter = U.getFilter(req.query, "subjectId");
        if (subjectFilter.subjectId != "")
            query.match({ "subject": subjectFilter.subjectId });

        var getAllTests = function () {
            var d = Q.defer();
            query.project({

                testName: 1,
                startDate: 1,
                createdAt: 1,
                endDate: 1,
                subject: 1,
                segments: 1,
                subSegments: 1,
                numberOfUsers: { $size: "$users" }
            });

            query.lookup({
                from: "subjects",
                localField: "subject",
                foreignField: "_id",
                as: "subject"
            });
            query.lookup({
                from: "segments",
                localField: "segments",
                foreignField: "_id",
                as: "segment"
            });

            query.lookup({
                from: "subsegments",
                localField: "subSegments",
                foreignField: "_id",
                as: "subSegment"
            });

            query.project({
                endDate: 1,
                startDate: 1,
                createdAt: 1,
                testName: 1,
                numberOfUsers: 1,
                segment: { "$arrayElemAt": ["$segment", 0] },
                subject: { "$arrayElemAt": ["$subject", 0] },
                subSegment: { "$arrayElemAt": ["$subSegment", 0] }
            });

            query.project({
                endDate: 1,
                startDate: 1,
                testName: 1,
                createdAt: 1,
                numberOfUsers: 1,
                segments: {
                    _id: "$segment._id",
                    name: "$segment.name",
                    iconUrl: "$segment.iconUrl",
                },
                subSegments: {
                    _id: "$subSegment._id",
                    name: "$subSegment.name",
                    iconUrl: "$subSegment.iconUrl",
                },
                subjects: {
                    _id: "$subject._id",
                    name: "$subject.name",
                    iconUrl: "$subject.iconUrl",
                }
            });

            query.facet({
                data: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
                count: [{
                    $group: {
                        _id: null, total: { $sum: 1 }
                    }
                }]
            });

            query.exec(function (err, response) {
                if (!err) {
                    if (response == null || response.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        let data = response[0].data;
                        pagination.total = response[0].count && response[0].count.length == 1 ? response[0].count[0].total : 0;
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data, null, pagination);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        getAllTests()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
    * @api {get} /api/admin/reports/tests/:testId/users
    * @apiName Get user who performed tests
    * @apiDescription get user who performed tests
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */
    app.get('/api/admin/reports/tests/:testId/users', function (req, res) {
        var out;
        var b = req.params;

        var getAllUsers = function (testId) {
            var d = Q.defer();
            var query = TestSummary.aggregate([
                {
                    $match: { testId: Mongoose.Types.ObjectId(testId) }
                }, {
                    $sort: { createdAt: -1 }
                }, {
                    $project: {
                        createdAt: 1,
                        startTime: 1,
                        userId: 1,
                        summary: 1,
                        questionCount: { $size: "$questions" },
                        endTime: 1,
                        testStatus: 1
                    }
                }, {
                    $lookup: {
                        from: "students1",
                        localField: "userId",
                        foreignField: "_id",
                        as: "user"
                    }
                }, {
                    $project: {
                        createdAt: 1,
                        startTime: 1,
                        summary: 1,
                        questionCount: 1,
                        endTime: 1,
                        testStatus: 1,
                        user: { "$arrayElemAt": ["$user", 0] }
                    }
                }, {
                    $project: {
                        createdAt: 1,
                        startTime: 1,
                        summary: 1,
                        questionCount: 1,
                        endTime: 1,
                        testStatus: 1,
                        user: {
                            createdAt: 1,
                            studentMobileNo: 1,
                            email: 1,
                            gender: 1,
                            name: 1,
                            isActive: 1,
                            isDeleted: 1,
                            deviceDetails: 1,
                            profileImage: 1,
                            city: 1,
                            state: 1,
                            isSchool: 1
                        }
                    }
                }
            ]);
            // query.populate("subject");
            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        getAllUsers(b.testId)
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
    * @api {get} /api/admin/reports/questions/statistics
    * @apiName Get Question statistics
    * @apiDescription getTopAttemptedQuestions , getTopCorrectAttemptedQuestions
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */
    app.get('/api/admin/reports/questions/statistics', function (req, res) {
        var out;
        var b = req.params;

        var segmentFilter = U.getFilter(req.query, "segmentIds", true);
        var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
        var subjectFilter = U.getFilter(req.query, "subjectId");

        var getTopAttemptedQuestions = function () {
            var d = Q.defer();
            var query = Question.aggregate([{
                $match: { isDeleted: false, isActive: true }
            }]);

            //  Applying filter
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments": { $in: segmentFilter } });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments.subSegmentId": { $in: subSegmentFilter } });
            if (subjectFilter.subjectId && subjectFilter.subjectId != "")
                query.match({ "subject": subjectFilter.subjectId });

            query.project({
                questionsText: 1,
                questionType: 1,
                createdAt: 1,
                subject: 1,
                segments: 1,
                subSegments: 1,
                units: 1,
                chapters: 1,
                topics: 1,
                numberOfAttempts: { $size: "$userIds" }
            });
            query.match({ "numberOfAttempts": { $gt: 0 } });
            query.sort({ "numberOfAttempts": -1 });
            query.limit(10);

            query.lookup({
                from: "subjects",
                localField: "subject",
                foreignField: "_id",
                as: "subject"
            });
            query.lookup({
                from: "segments",
                localField: "segments",
                foreignField: "_id",
                as: "segments"
            });
            query.lookup({
                from: "subsegments",
                localField: "subSegments.subSegmentId",
                foreignField: "_id",
                as: "subSegments"
            });
            query.lookup({
                from: "units",
                localField: "units",
                foreignField: "_id",
                as: "units"
            });
            query.lookup({
                from: "chapters",
                localField: "chapters",
                foreignField: "_id",
                as: "chapters"
            });
            query.lookup({
                from: "topics",
                localField: "topics",
                foreignField: "_id",
                as: "topics"
            });
            query.project({
                createdAt: 1,
                questionType: 1,
                questionsText: 1,
                "subject": { "$arrayElemAt": ["$subject", 0] },
                numberOfAttempts: 1,
                "unit": { "$arrayElemAt": ["$units", 0] },
                "chapter": { "$arrayElemAt": ["$chapters", 0] },
                "topic": { "$arrayElemAt": ["$topics", 0] },
                "segment": { "$arrayElemAt": ["$segments", 0] },
                "subSegment": { "$arrayElemAt": ["$subSegments", 0] },
            });
            query.project({
                createdAt: 1,
                questionType: 1,
                questionsText: 1,
                subject: { "_id": "$subject._id", "name": "$subject.name", "iconUrl": "$subject.iconUrl" },
                numberOfAttempts: 1,
                "units": { "_id": "$unit._id", "name": "$unit.name", "iconUrl": "$unit.iconUrl" },
                "chapters": { "_id": "$chapter._id", "name": "$chapter.name", "iconUrl": "$chapter.iconUrl" },
                "topics": { "_id": "$topic._id", "name": "$topic.name", "iconUrl": "$topic.iconUrl" },
                "segments": { "_id": "$segment._id", "name": "$segment.name", "iconUrl": "$segment.iconUrl" },
                "subSegments": { "_id": "$subSegment._id", "name": "$subSegment.name", "iconUrl": "$subSegment.iconUrl" }
            });
            query.project({
                createdAt: 1,
                questionType: 1,
                questionsText: 1,
                subject: 1,
                numberOfAttempts: 1,
                "units": 1,
                "chapters": 1,
                "topics": 1,
                "segments": 1,
                "subSegments": 1
            });

            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var getTopCorrectAttemptedQuestions = function () {
            var d = Q.defer();
            var query = Practice.aggregate([
                {
                    $unwind: "$questions"
                }, {
                    $match: { "questions.status": "correct" }
                }, {
                    $group: {
                        _id: "$questions.questionId",
                        correctCount: { $sum: 1 }
                    }
                }, {
                    $match: { "correctCount": { "$gt": 0 } }
                }, {
                    $sort: { correctCount: -1 }
                }, {
                    $lookup: {
                        from: "questions",
                        localField: "_id",
                        foreignField: "_id",
                        as: "question"
                    }
                }, {
                    $project: {
                        correctCount: 1,
                        question: { "$arrayElemAt": ["$question", 0] },
                    }
                }, {
                    $project: {
                        correctCount: 1,
                        questionsText: "$question.questionsText",
                        questionType: "$question.questionType",
                        createdAt: "$question.createdAt",
                        subject: "$question.subject",
                        segments: "$question.segments",
                        subSegments: "$question.subSegments",
                        units: "$question.units",
                        chapters: "$question.chapters",
                        topics: "$question.topics",
                        numberOfAttempts: { $size: "$question.userIds" }
                    }
                }]);

            //  Applying filter
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments": { $in: segmentFilter } });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments.subSegmentId": { $in: subSegmentFilter } });
            if (subjectFilter.subjectId && subjectFilter.subjectId != "")
                query.match({ "subject": subjectFilter.subjectId });

            query.limit(10);
            query.append({
                $lookup: {
                    from: "subjects",
                    localField: "subject",
                    foreignField: "_id",
                    as: "subject"
                }
            }, {
                    $lookup: {
                        from: "segments",
                        localField: "segments",
                        foreignField: "_id",
                        as: "segments"
                    }
                }, {
                    $lookup: {
                        from: "subsegments",
                        localField: "subSegments.subSegmentId",
                        foreignField: "_id",
                        as: "subSegments"
                    }
                }, {
                    $lookup: {
                        from: "units",
                        localField: "units",
                        foreignField: "_id",
                        as: "units"
                    }
                }, {
                    $lookup: {
                        from: "chapters",
                        localField: "chapters",
                        foreignField: "_id",
                        as: "chapters"
                    }
                }, {
                    $lookup: {
                        from: "topics",
                        localField: "topics",
                        foreignField: "_id",
                        as: "topics"
                    }
                }, {
                    $project: {
                        createdAt: 1,
                        questionType: 1,
                        questionsText: 1,
                        correctCount: 1,
                        "subject": { "$arrayElemAt": ["$subject", 0] },
                        numberOfAttempts: 1,
                        "unit": { "$arrayElemAt": ["$units", 0] },
                        "chapter": { "$arrayElemAt": ["$chapters", 0] },
                        "topic": { "$arrayElemAt": ["$topics", 0] },
                        "segment": { "$arrayElemAt": ["$segments", 0] },
                        "subSegment": { "$arrayElemAt": ["$subSegments", 0] },
                    }
                }, {
                    $project: {
                        createdAt: 1,
                        questionType: 1,
                        questionsText: 1,
                        correctCount: 1,
                        subject: { "_id": "$subject._id", "name": "$subject.name", "iconUrl": "$subject.iconUrl" },
                        numberOfAttempts: 1,
                        "units": { "_id": "$unit._id", "name": "$unit.name", "iconUrl": "$unit.iconUrl" },
                        "chapters": { "_id": "$chapter._id", "name": "$chapter.name", "iconUrl": "$chapter.iconUrl" },
                        "topics": { "_id": "$topic._id", "name": "$topic.name", "iconUrl": "$topic.iconUrl" },
                        "segments": { "_id": "$segment._id", "name": "$segment.name", "iconUrl": "$segment.iconUrl" },
                        "subSegments": { "_id": "$subSegment._id", "name": "$subSegment.name", "iconUrl": "$subSegment.iconUrl" }
                    }
                }, {
                    $project: {
                        createdAt: 1,
                        questionType: 1,
                        questionsText: 1,
                        subject: 1,
                        numberOfAttempts: 1,
                        correctCount: 1,
                        "units": 1,
                        "chapters": 1,
                        "topics": 1,
                        "segments": 1,
                        "subSegments": 1
                    }
                });
            // query.populate("subject");
            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var data = {};
        getTopAttemptedQuestions()
            .then(function (out) {
                data.topAttemptedQuestion = out;
                return getTopCorrectAttemptedQuestions();
            })
            .then(function (out) {
                data.topCorrectQuestion = out;
                res.json(U.getJson(200, "success", data));
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
    * @api {get} /api/admin/reports/questions/reports/byQuestionType
    * @apiName Get Question statistics
    * @apiDescription getTopAttemptedQuestions , getTopCorrectAttemptedQuestions
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */
    app.get('/api/admin/reports/questions/reports/byQuestionType', function (req, res) {
        var out;
        var b = req.params;

        var segmentFilter = U.getFilter(req.query, "segmentIds", true);
        var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
        var subjectFilter = U.getFilter(req.query, "subjectId");

        var getQuestionByType = function () {
            var d = Q.defer();
            var query = Question.aggregate([
                {
                    $match: { isActive: true, isDeleted: false }
                }]);

            //  Applying filter
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments": { $in: segmentFilter } });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments.subSegmentId": { $in: subSegmentFilter } });
            if (subjectFilter.subjectId && subjectFilter.subjectId != "")
                query.match({ "subject": subjectFilter.subjectId });

            query.append({
                $unwind: "$subSegments"
            }, {
                    $group: {
                        _id: { qType: "$questionType", level: "$subSegments.difficultyLevel" },
                        count: { $sum: 1 }
                    }
                }, {
                    $project: {
                        qType: "$_id.qType",
                        level: "$_id.level",
                        _id: 0,
                        count: 1
                    }
                }, {
                    $group: {
                        _id: "$qType",
                        difficultyLevel: { $push: { "level": "$level", "count": "$count" } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        questionType: "$_id",
                        difficultyLevel: 1

                    }
                }, {
                    $sort: {
                        questionType: 1
                    }
                });
            // query.populate("subject");
            query.exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {

                        var final = [];
                        try {
                            for (var i = 0; i < data.length; i++) {
                                var obj = {};
                                obj.questionType = data[i].questionType;
                                for (var j = 0; j < data[i].difficultyLevel.length; j++) {
                                    var l = data[i].difficultyLevel[j];
                                    if (l.level == 1)
                                        obj.easy = l.count;
                                    else if (l.level == 2)
                                        obj.medium = l.count;
                                    else if (l.level == 3)
                                        obj.hard = l.count;
                                }
                                var total = 0;
                                if (!obj.easy)
                                    obj.easy = 0;
                                else total += obj.easy;
                                if (!obj.medium)
                                    obj.medium = 0;
                                else total += obj.medium;
                                if (!obj.hard)
                                    obj.hard = 0;
                                else total += obj.hard;

                                obj.total = total;
                                final.push(obj);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                        out = U.getJson(C.STATUS_SUCCESS_CODE, final.length, final);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var data = {};
        getQuestionByType()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
    * @api {get} /api/admin/reports/questions/reports/byUnits
    * @apiName Get Question getQuestionByUnits
    * @apiDescription getQuestionByUnits
    * @apiGroup Reports
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    */
    app.get('/api/admin/reports/questions/reports/byUnits', function (req, res) {
        var out;
        var b = req.params;
        var pagination = U.getPagination(req.query);

        var getQuestionByUnits = function () {
            var d = Q.defer();

            var segmentFilter = U.getFilter(req.query, "segmentIds", true);
            var subSegmentFilter = U.getFilter(req.query, "subSegmentIds", true);
            var subjectFilter = U.getFilter(req.query, "subjectId");

            var query = Question.aggregate([{ $match: { isActive: true, isDeleted: false } }]);

            //  Applying filter
            if (segmentFilter && segmentFilter.length > 0)
                query.match({ "segments": { $in: segmentFilter } });
            if (subSegmentFilter && subSegmentFilter.length > 0)
                query.match({ "subSegments.subSegmentId": { $in: subSegmentFilter } });
            if (subjectFilter.subjectId && subjectFilter.subjectId != "")
                query.match({ "subject": subjectFilter.subjectId });

            query.append({ $unwind: { path: "$units" } }, { $group: { _id: "$units", count: { $sum: 1 }, subjects: { $addToSet: "$subject" }, segments: { $addToSet: "$segments" }, subSegments: { $addToSet: "$subSegments" } } }, { $project: { count: 1, subjects: 1, segments: { $arrayElemAt: ["$segments", 0] }, subSegments: { $arrayElemAt: ["$subSegments", 0] } } }, { $sort: { count: -1, } }, {
                $lookup: {
                    from: 'units',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'units'
                }
            }, { $lookup: { from: 'subjects', localField: 'subjects', foreignField: '_id', as: 'subjects' } }, { $lookup: { from: 'segments', localField: 'segments', foreignField: '_id', as: 'segments' } }, { $lookup: { from: 'subsegments', localField: 'subSegments.subSegmentId', foreignField: '_id', as: 'subSegments' } });

            query.facet({
                data: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
                count: [{
                    $group: {
                        _id: null, total: { $sum: 1 }
                    }
                }]
            });

            query.exec(function (err, response) {
                if (!err) {
                    if (response == null || response.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        let data = response[0].data;
                        pagination.total = response[0].count && response[0].count.length == 1 ? response[0].count[0].total : 0;
                        out = U.getJson(C.STATUS_SUCCESS_CODE, data.length, data, null, pagination);
                        d.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };

        var data = {};
        getQuestionByUnits()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });
}