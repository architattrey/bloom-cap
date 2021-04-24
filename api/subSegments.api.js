var Q = require('q');
var request = require('request');
var C = require('./../constant');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var Subject = require('./../models/subjects.model');
var SubSegment = require('./../models/subSegments.model');


module.exports = function (app) {

    /**
     * @api {post} /api/admin/subSegments Add new sub_segment
     * @apiName Add sub_segment
     * @apiDescription Add a new sub_segment
     * @apiGroup SubSegment
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body
     * @apiParam {array-string} segmentIds . In body ["59a7f58ee7e73428301e6cdc","59a7f58ee7e73428301e6cdc"]
     * @apiParam {string} image . In body
     * @apiParam {boolean} isSchool . In body true for Boards and false for competion Exam
     */

    app.post('/api/admin/subSegments', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.userId = req.headers.userid;
        var addSubSegments = function () {
            var defer = Q.defer();
            if (b.segmentIds.length == 0) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Segment can not be blank', b);
                defer.reject(out);
            }
            var subSegment = new SubSegment();
            subSegment.name = b.name;
            subSegment.iconUrl = b.iconUrl;
            subSegment.bannerUrl = b.bannerUrl;
            subSegment.timestamp = U.getTimeStamp();
            subSegment.segments = b.segmentIds;
            subSegment.createdById = b.userId;
            subSegment.isSchool = b.isSchool;

            subSegment.save(function (err, data) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, b);
                    defer.resolve(out);
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
        addSubSegments()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/subSegments Get All sub_segment
     * @apiName Get sub_segment
     * @apiDescription Get All sub_segment
     * @apiGroup SubSegment
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} isActive . In Query param. (true||false)
     * @apiParam {string} isSchool . In Query param. (true||false)
     * @apiParam {string} keyword . In Query param. 
     */

    app.get('/api/admin/subSegments', function (req, res) {
        var out;
        var b = {};
        b.fromDate = req.query.fromDate == undefined ? '' : req.query.fromDate;
        b.toDate = req.query.toDate == undefined ? '' : req.query.toDate;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? C.PAGINATION_DEFAULT_PAGE_NUMBER : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.isSchool = req.query.isSchool == undefined ? '' : req.query.isSchool;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }

        var getAllSubSegments = function () {
            var query = SubSegment.find({
                isDeleted: false
            }, {
                    name: 1,
                    _id: 1,
                    createdAt: 1,
                    isActive: 1,
                    timestamp: 1,
                    segments: 1
                });
            if (b.keyword != '')
                query = SubSegment.find({
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    },
                    isDeleted: false
                })
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.isSchool != '')
                query = query.where('isSchool').equals(b.isSchool)
            var defer = Q.defer();
            query.sort({
                createdAt: -1
            }).populate('segments', '_id name isDeleted').skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, subSegments) {
                if (!err) {
                    if (subSegments == null || subSegments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {
                        var activeSusegments = [];
                        subSegments.forEach(function (doc, i) {
                            if (doc.segments) {
                                var data = doc.segments.filter(function (s) {
                                    return s.isDeleted == false;
                                })
                                if (data.length != 0) {
                                    subSegments[i].segments = data;
                                    activeSusegments.push(subSegments[i]);
                                }
                            }
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeSusegments, err, U.getPaginationObject(activeSusegments.length, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllSubSegments()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {put} /api/admin/subSegments/:id Update sub_segment 
     * @apiName Update sub_segment
     * @apiDescription Update sub_segment
     * @apiGroup SubSegment
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is subject id)In params
     * @apiParam {string} name . In Body
     * @apiParam {string} segments . In Body sample : segments:["59f14b4a3658f6000499eab2","59f0c62609bc3c0004359042"]
     * @apiParam {string} isActive . In Body 
     * @apiParam {string} isDeleted . In Body 
     */

    app.put('/api/admin/subSegments/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.subSegmentId = req.params.id;
        b.userId = req.headers.userid;

        var findSubSegments = function () {
            var defer = Q.defer();
            SubSegment.find({
                _id: b.subSegmentId
            }, function (err, subSegments) {
                if (!err) {
                    if (subSegments == null && subSegments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        defer.resolve(subSegments);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateSubSegment = function (subSegments) {
            var defer = Q.defer();
            if (b.name == undefined) {
                name = subSegments[0].name;
            } else {
                name = b.name;
            }
            if (b.segmentIds == undefined) {
                segments = subSegments[0].segments;
            } else {
                segments = b.segmentIds;
            }
            if (b.iconUrl == undefined) {
                iconUrl = subSegments[0].iconUrl;
            } else {
                iconUrl = b.iconUrl;
            }
            if (b.bannerUrl == undefined) {
                bannerUrl = subSegments[0].bannerUrl;
            } else {
                bannerUrl = b.bannerUrl;
            }
            if (b.isActive == undefined) {
                isActive = subSegments[0].isActive;
            } else {
                isActive = b.isActive;
            }
            if (b.isDeleted == undefined) {
                isDeleted = subSegments[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }
            updatedById = b.userId;
            SubSegment.findByIdAndUpdate({
                _id: b.subSegmentId
            }, {
                    $set: {
                        "name": name,
                        "iconUrl": iconUrl,
                        "bannerUrl": bannerUrl,
                        "isActive": isActive,
                        "updatedById": updatedById,
                        "segments": segments,
                        "isDeleted": isDeleted,
                    }
                }, {
                    upsert: true
                }, function (err, subSegments) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subSegments);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        findSubSegments()
            .then(function (subSegments) {
                return updateSubSegment(subSegments);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });


    /**
     * @api {get} /api/admin/subSegments/search Sub_Segment Search 
     * @apiName Sub_segment 
     * @apiDescription Search Sub_Sgment by name
     * @apiGroup SubSegment
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In Query param
     * @apiParam {string} segment . In Query param
     */

    app.get('/api/admin/subSegments/search', function (req, res) {
        var out;
        var b = {};
        b.name = req.query.name;
        b.segment = req.query.segment;
        var getAllSubSegments = function () {
            var defer = Q.defer();
            if (b.name != '' && b.name != undefined) {
                var regexSearchOptions = {
                    "name": {
                        "$regex": b.name,
                        '$options': 'i'
                    },
                    isDeleted: false
                };
            } else {
                var regexSearchOptions = {
                    "segments": {
                        "$regex": b.segment,
                        '$options': 'i'
                    },
                    isDeleted: false
                };
            }
            SubSegment.find(regexSearchOptions, {
                name: 1,
                _id: 1,
                createdAt: 1,
                isActive: 1,
                timestamp: 1,
                segments: 1
            }, function (err, subSegments) {
                if (!err) {
                    if (subSegments != null && subSegments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No sub_segments found')
                        defer.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subSegments);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllSubSegments()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/subSegments/:id Get SubSegment by id
     * @apiName Get SubSegment by id
     * @apiDescription Get SubSegment by id
     * @apiGroup SubSegment
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is SubSegment id)
     */

    app.get('/api/admin/subSegments/:id', function (req, res) {
        var out;
        var b = {};
        b.subSegmentId = req.params.id;
        var getAllSubSubjects = function (subjectCount) {
            var defer = Q.defer();
            SubSegment.find({
                _id: b.subSegmentId,
                isDeleted: false
            }, {
                    name: 1,
                    _id: 1,
                    createdAt: 1,
                    isActive: 1,
                    iconUrl: 1,
                    bannerUrl: 1,
                    segments: 1
                }).populate('segments', 'name').exec(function (err, subSegments) {
                    if (!err) {
                        if (subSegments == null && subSegments.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No subjects found')
                            defer.reject(out);
                        } else {

                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subSegments);
                            defer.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getAllSubSubjects()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/admin/getsubsegmentbysegmentids Get Sub-Segments by segments ids
     * @apiName Get Sub-Segments by ids
     * @apiDescription Get segments by ids
     * @apiGroup Segments
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} segmentIds . In body (id is | separated )
     */

    app.post('/api/admin/getSubSegmentsBySegmentIds', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        console.log("data from input", b);
        //var arr = U.stringToObjectId(b.segmentIds);
        // b.segmentId = req.params.id;
        var getSegmentById = function () {
            var defer = Q.defer();
            SubSegment.aggregate([{
                $unwind: "$segments"
            },
            {
                $match: {
                    "segments": {
                        $in: b.map(function (o) {
                            return Mongoose.Types.ObjectId(o);
                        })
                    },
                    isDeleted: false
                }
            },
            {
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
            ], function (err, segments) {
                if (!err) {
                    if (segments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, segments);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getSegmentById()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/admin/getsubjectbysubsegmentsids Get Subject by Sub-Segments ids
     * @apiName Get Subjects by Sub-Segments ids
     * @apiDescription Get Subjects by Sub-Segments ids
     * @apiGroup Subjects
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} subSegmentsIds . In body (id is | separated )
     */

    app.post('/api/admin/getsubjectbysubsegmentsids', function (req, res) {
        var out;
        var b = req.body;
        var arr = U.stringToObjectId(b.subSegmentsIds);
        var getSubjectByIds = function () {
            var defer = Q.defer();
            Subject.aggregate([{
                $unwind: "$subSegments"
            },
            {
                $match: {
                    "subSegments": {
                        $in: arr.map(function (o) {
                            return Mongoose.Types.ObjectId(o);
                        })
                    },
                }
            },
            {
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
            ], function (err, subjects) {
                if (!err) {
                    if (subjects.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No Subject's found");
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
        getSubjectByIds()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/subSsegments Get All Subsegments 
     * @apiName Get All Subsegments 
     * @apiDeprecated
     * @apiDescription Get All Subsegments 
     * @apiGroup Mobile
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     */

    app.get('/api/subSsegments', function (req, res) {
        var out;
        var b = {};
        var getSubSegment = function () {
            var defer = Q.defer();
            SubSegment.find({
                isActive: false
            }).populate('segments', 'name').exec(function (err, subSegments) {
                if (!err) {
                    if (subSegments == null || subSegments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subSegments);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getSubSegment()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/segments/:id/classes Get All classes by segmentId
     * @apiName All Get All classes by segmentId
     * @apiDescription All Get All classes by segmentId
     * @apiGroup Mobile
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiSuccessExample {json} Success-Response:
     * {
     *   "status": C.STATUS_SUCCESS_CODE,
     *   "message": "success",
     *   "data": [
     *   {
     *       "_id": "5a02e6b7f9472528dcff5a34",
     *       "name": "second"
     *   },
     *   {
     *       "_id": "5a02e737f9472528dcff5a3b",
     *       "name": "XIV"
     *   },
     *   {
     *       "_id": "5a03fad1a0cc9d000409455c",
     *       "name": "X"
     *   },
     *   {
     *       "_id": "59ff98c72af60a77f541d246",
     *       "name": "VIII"
     *  },
     *   {
     *       "_id": "59f6f9fc4b96af0004b66e72",
     *       "name": "IX"
     *   }
     *   ],
     *   "paginate": {},
     *   "error": {}
     *   }
     */

    app.get('/api/segments/:id/classes', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        if (b.id == undefined || b.id == "") {
            res.json(U.getJson(C.STATUS_ERR_KNOWN_CODE, "Provided segment is not correct", b));
            return;
        }
        var getSubSegment = function () {
            var defer = Q.defer();
            SubSegment.aggregate([{
                $unwind: "$segments"
            },
            {
                $match: {
                    "segments": Mongoose.Types.ObjectId(b.id),
                    "isDeleted": false,
                    "isActive": true
                }
            },
            {
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
            ]).exec(function (err, subSegments) {
                if (!err) {
                    if (subSegments == null || subSegments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subSegments);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getSubSegment()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}