var U = require('./../share/util.api');
var C = require('./../constant');
var J = require('./../share/comman.methods');
var Mongoose = require('mongoose');
var Subject = require('./../models/subjects.model');
var request = require('request');
var Q = require('q');
var Summary = require('./../models/practiceSummery.model');
var _ = require('underscore')._;
var async = require('async');

module.exports = function (app) {

    /**
     * @api {post} /api/admin/subjects Add new subject
     * @apiName Add subject
     * @apiDescription Add a new subject
     * @apiGroup Subjects
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body
     * @apiParam {string} iconUrl . In body
     * @apiParam {string} bannerUrl . In body
     * @apiParam {array-string} segmentIds . In body   segments:["59a7f58ee7e73428301e6cdc","59a7f58ee7e73428301e6cdc"]
     * @apiParam {array-string} subSegmentIds . In body   subSegments:["59a7f58ee7e73428301e6cdc","59a7f58ee7e73428301e6cdc"]
     * @apiParamExample {json} Request-Example:
     *  {
     *  "name": "Mysql",
     *  "segmentIds": [
     *      "59c2172ab500ce0a946aa93a",
     *      "59c21734b500ce0a946aa93b",
     *      "59c2173fb500ce0a946aa93c"
     *  ],
     *   "subSegmentIds": [
     *      "59c2172ab500ce0a946aa93a",
     *      "59c21734b500ce0a946aa93b",
     *      "59c2173fb500ce0a946aa93c"
     *      ],
     *  "iconUrl": "http://loremflickr.com/320/240/dog",
     *  "bannerUrl": "http://loremflickr.com/320/240/dog"
     *  }
     */

    app.post('/api/admin/subjects', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.userId = req.headers.userid;
        var findSubject = function () {
            var defer = Q.defer();
            Subject.aggregate([{
                $unwind: "$segments"
            },
            {
                $unwind: "$subSegments"
            },
            {
                $match: {
                    "name": b.name,
                    "isDeleted": false,
                    "segments": {
                        $in: b.segmentIds.map(function (o) {
                            return Mongoose.Types.ObjectId(o);
                        })
                    },
                    "subSegments": {
                        $in: b.subSegmentIds.map(function (o) {
                            return Mongoose.Types.ObjectId(o);
                        })
                    },
                }
            }, {
                $group: {
                    _id: {
                        name: '$name',
                        id: '$_id'
                    },

                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id.name',
                    _id: '$_id.id'

                }
            }
            ]).exec(function (err, subjects) {
                if (!err) {
                    defer.resolve(subjects);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var addSubjects = function () {
            var defer = Q.defer();
            if (b.segmentIds == undefined || b.segmentIds.length == 0) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Segment can't be blank", b);
                defer.reject(out);
            }
            if (b.subSegmentIds == undefined || b.subSegmentIds.length == 0) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "subSegments can't be blank", b);
                defer.reject(out);
            }
            var subject = new Subject();
            subject.name = b.name;
            subject.iconUrl = b.iconUrl;
            subject.bannerUrl = b.bannerUrl;
            subject.segments = b.segmentIds;
            subject.subSegments = b.subSegmentIds;
            subject.createdBy = b.userId;
            subject.timestamp = U.getTimeStamp();
            subject.save(function (err, data) {
                if (!err) {

                    defer.resolve();
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Seems this data already exist !', b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        findSubject()
            .then(function (subject) {
                if (subject == null || subject.length == 0) {
                    return addSubjects();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Seems data already exist !', subject);
                    res.json(out);
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
     * @api {get} /api/admin/subjects Get All subject
     * @apiName Get subjects
     * @apiDescription Get All subject || Search an subject || filter 
     * @apiGroup Subjects
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} isActive . In Query param
     * @apiParam {string} segment . In Query param. 
     * @apiParam {string} subSegment . In Query param.
     * @apiParam {string} keyword . In Query param. Name
     */

    app.get('/api/admin/subjects', function (req, res) {
        var out;
        var b = {};
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;
        b.segment = req.query.segment == undefined ? '' : req.query.segment;
        b.subSegment = req.query.subSegment == undefined ? '' : req.query.subSegment;
        b.subject = req.query.subject == undefined ? '' : req.query.subject;

        var pageOptions = {
            page: parseInt(b.pageNumber) || C.PAGINATION_DEFAULT_PAGE_NUMBER,
            limit: parseInt(b.pageSize) || C.PAGINATION_DEFAULT_PAGE_SIZE
        }

        var getSubjectCount = function () {
            var defer = Q.defer();
            var query = Subject.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.segment != '')
                query = query.where('segments').in([Mongoose.Types.ObjectId(b.segment)])
            if (b.subSegment != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegment)])
            query.count().exec(function (err, subjectCount) {
                if (!err) {
                    b.subjectCount = subjectCount;
                    defer.resolve(subjectCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllSubject = function (subjectCount) {
            var defer = Q.defer();
            var query = Subject.find({
                isDeleted: false
            });
            if (b.keyword != '')
                query = Subject.find({
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    },
                    isDeleted: false
                })
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.segment != '')
                query = query.where('segments').in([Mongoose.Types.ObjectId(b.segment)])
            if (b.subSegment != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegment)])


            query
                .sort({ createdAt: -1 })
                .populate('segments subSegments', '_id name isDeleted')
                .skip(pageOptions.limit * (pageOptions.page - 1))
                .limit(pageOptions.limit)
                .exec(function (err, subjects) {
                    if (!err) {
                        if (subjects == null || subjects.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                            defer.reject(out);
                        } else {
                            for (var s = 0; s < subjects.length; s++) {
                                subjects[s].segments = subjects[s].segments.filter(function (seg) {
                                    return !seg.isDeleted;
                                })
                                subjects[s].subSegments = subjects[s].subSegments.filter(function (subSeg) {
                                    return !subSeg.isDeleted;
                                })
                            }
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subjects, err, U.getPaginationObject(subjectCount, b.pageSize, b.pageNumber));
                            defer.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getSubjectCount()
            .then(function (subjectCount) {
                return getAllSubject(subjectCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {put} /api/admin/subjects/:id Update subject 
     * @apiName Update subject
     * @apiDescription Update subject
     * @apiGroup Subjects
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is subject id)In params
     * @apiParam {string} name . In Body
     * @apiParam {string} subSegments . In Body sample:- subSegments:["",""]
     * @apiParam {string} segments . In Body sample :- segments:["",""]
     * @apiParam {string} isActive . In Body
     * @apiParam {string} isDeleted . In Body
     */

    app.put('/api/admin/subjects/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.subjectId = req.params.id;
        var findSubjectById = function () {
            var defer = Q.defer();
            Subject.find({
                _id: b.subjectId
            }, function (err, subject) {
                if (!err) {
                    if (subject != null && subject.length > 0) {
                        defer.resolve(subject);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No data found", b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateSubjects = function (subject) {
            var defer = Q.defer();
            if (b.name == undefined) {
                name = subject[0].name;
            } else {
                name = b.name;
            }
            if (b.isActive == undefined) {
                isActive = subject[0].isActive;
            } else {
                isActive = b.isActive;
            }
            if (b.isDeleted == undefined) {
                isDeleted = subject[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }
            if (b.subSegmentIds && b.subSegmentIds.length > 0) {
                subSegments = b.subSegmentIds;
            } else {
                subSegments = subject[0].subSegments;
            }
            if (b.segmentIds && b.segmentIds.length > 0) {
                segments = b.segmentIds;
            } else {
                segments = subject[0].segments;
            }
            if (b.iconUrl == undefined) {
                iconUrl = subject[0].iconUrl;
            } else {
                iconUrl = b.iconUrl;
            }
            Subject.findByIdAndUpdate({
                _id: b.subjectId
            }, {
                    $set: {
                        "name": name,
                        "isActive": isActive,
                        "subSegments": subSegments,
                        "segments": segments,
                        "isDeleted": isDeleted,
                        "iconUrl": iconUrl
                    }
                }, {
                    upsert: true
                }, function (err, subjects) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subjects);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        findSubjectById()
            .then(function (subject) {
                return updateSubjects(subject);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/subjects/:id Get subject by id
     * @apiName Get subject by id
     * @apiDescription Get subject by id
     * @apiGroup Subjects
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is subject id)
     */

    app.get('/api/admin/subjects/:id', function (req, res) {
        var out;
        var b = {};
        b.subjectId = req.params.id;
        var getAllSubjects = function () {
            var defer = Q.defer();
            Subject.find({
                _id: b.subjectId
            }, {
                    name: 1,
                    _id: 1,
                    createdAt: 1,
                    isActive: 1,
                    segments: 1,
                    subSegments: 1,
                    iconUrl: 1
                }).populate('segments subSegments', '_id name').exec(function (err, subjects) {
                    if (!err) {
                        if (subjects == null && subjects.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                            defer.reject(out);
                        } else {

                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subjects);
                            defer.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getAllSubjects()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/subjects Get All subject
     * @apiName Get subjects
     * @apiDescription Get All subject || Search an subject || filter 
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header - sample value: 59f431fee840fd3d98df6540
     * @apiParam {string} authToken . In Header - sample value: 59f6f9c74b96af0004b66e71
     * @apiParam {string} apiKey . In Header - value :- 1c24171393dc5de04ffcb21f1182ab28
     * @apiParam {string} version . In Header - value : 1
     * @apiParam {string} pageNumber . In Query Param sample value:- 1
     * @apiParam {string} pageSize . In Query Param sample value :- 10
     * @apiSuccessExample {json} Success-Response:
     * {
     *   "status": C.STATUS_SUCCESS_CODE,
     *   "message": "success",
     *   "data": [
     *   {
     *       "_id": "59f6fa1c4b96af0004b66e73",
     *       "name": "MATH",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/physics",
     *       "proficiency": 60
     *   }
     *   ],
     *   "paginate": {},
     *   "error": {}
     *   }
     */

    app.get('/api/subjects', function (req, res) {
        var out;
        var b = {};
        b.userId = req.headers.userid;
        var subjects = [];
        var getSubject = function () {
            var defer = Q.defer();
            Subject.aggregate([{
                $match: {
                    "segments": {
                        $in: [Mongoose.Types.ObjectId(b.segment)]
                    },
                    "subSegments": {
                        $in: [Mongoose.Types.ObjectId(b.subSegment)]
                    },
                    "isDeleted": false,
                    "isActive": true
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    iconUrl: 1,
                    bannerUrl: 1
                }
            },
            {
                $addFields: {
                    proficiency: 0,
                }
            }
            ],
                function (err, subjects) {
                    if (!err) {
                        if (subjects == null || subjects.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            defer.reject(out);
                        } else {
                            defer.resolve(subjects);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }

        var getProficiency = function (userId, subjectList) {
            var defer = Q.defer();
            Summary.aggregate([{
                $match: {
                    "subject": {
                        $in: subjectList
                    },
                    "summaryType": "subject",
                    "userId": Mongoose.Types.ObjectId(userId),
                }
            },
            {
                $project: {
                    proficiency: "$summary.proficiency",
                    _id: 0,
                    subjectId: "$subject"
                }
            }
            ],
                function (err, data) {
                    if (!err) {
                        if (data && data.length > 0) {
                            // console.log("prof data for subject : %j", data);
                            for (var i = 0; i < subjects.length; i++) {
                                var s = subjects[i];
                                // console.log("Matching subject %j", s);
                                var matchedData = _.find(data, function (d) {
                                    return d.subjectId.equals(s._id);
                                });
                                if (matchedData && matchedData.proficiency)
                                    subjects[i].proficiency = matchedData.proficiency;
                            }
                        }
                        defer.resolve(subjects);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }
        J.verifyUser(b.userId)
            .then(function (user) {
                b.segment = user.segment;
                b.subSegment = user.subSegment;
                return getSubject();
            })
            .then(function (data) {
                subjects = data;
                var subjectList = data.map(function (s) { return s._id });
                return getProficiency(b.userId, subjectList);
            })
            .then(function (subjects) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subjects);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/subjects/:id Get subject by id
     * @apiName Get subject by id
     * @apiDescription Get subject by id
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is subject id)
     */

    app.get('/api/subjects/:id', function (req, res) {
        var out;
        var b = {};
        b.subjectId = req.params.id;
        var getAllSubjects = function () {
            var defer = Q.defer();
            Subject.find({
                _id: b.subjectId
            }, {
                    name: 1,
                    _id: 1,
                    createdAt: 1,
                    isActive: 1,
                    segments: 1,
                    subSegments: 1,
                    iconUrl: 1
                }).populate('segments subSegments', '_id name').exec(function (err, subjects) {
                    if (!err) {
                        if (subjects == null && subjects.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                            defer.reject(out);
                        } else {

                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subjects);
                            defer.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getAllSubjects()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
    

    /**
     * @api {get} /api/subjects/:id/summary get summary by subject
     * @apiName Get summary by subject
     * @apiDescription Get summary by subject
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header - sample value: 59f431fee840fd3d98df6540
     * @apiParam {string} authToken . In Header - sample value: 59f6f9c74b96af0004b66e71
     * @apiParam {string} apiKey . In Header - value :- 1c24171393dc5de04ffcb21f1182ab28
     * @apiParam {string} version . In Header - value : 1
     * @apiParam {string} id . In Path (subject id)
     */

    app.get('/api/subjects/:id/summary1', function (req, res) {
        var out;
        var b = {};
        b.userId = req.headers.userid;

        J.verifyUser(b.userId)
            .then(function (user) {
                var summary = {};
                summary.score = "0/0";
                summary.description = "<strong> Looks like you need to earn more skills in this subject </strong>";
                summary.totalQuestion = 0 + " Questions";
                summary.correctCount = 0 + " Questions";
                summary.incorrectCount = 0 + " Questions";
                summary.skipCount = 0 + " Questions";
                summary.accuracy = "0";
                summary.timespent = "0 Min";
                summary.skillEarned = "0%";
                summary.progress = 0;

                var out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                res.json(out);
            })

            .fail(function (out) {
                res.json(out);
            })
    })

    app.get('/api/subjects/:id/summary', function (req, res) {
        var out;
        var b = {};
        b.userId = req.headers.userid;
        b.subjectId = req.params.id;
        var getSubjectSummary = function () {
            var defer = Q.defer()
            Summary.find({
                subject: Mongoose.Types.ObjectId(b.subjectId),
                userId: b.userId,
                "summaryType": "subject"
            }, {
                    summary: 1
                }, { lean: true }, function (err, subjectSummary) {
                    if (!err) {
                        if (!subjectSummary || subjectSummary.length == 0) {
                            var summary = {};
                            summary.score = "0/0";
                            summary.description = "<strong> Looks like you need to earn more skills in this subject </strong>";
                            summary.totalQuestion = 0;
                            summary.correctCount = 0;
                            summary.incorrectCount = 0;
                            summary.skipCount = 0;
                            summary.accuracy = 0;
                            summary.timeSpent = 0;
                            summary.skillEarned = 0;
                            summary.proficiency = 0;
                            summary.progress = 0;
                            defer.resolve(summary);
                        } else {
                            defer.resolve(subjectSummary[0].summary);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }

        J.verifyUser(b.userId)
            .then(function (user) {
                return getSubjectSummary();
            })
            .then(function (summary) {
                var out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, summary);
                res.json(out);
            })

            .fail(function (out) {
                res.json(out);
            })
    })

}