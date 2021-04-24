var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var ExpressJoi = require('express-joi-validator');
var Segment = require('./../models/segments.model');

module.exports = function (app) {

    /**
     * @api {post} /api/admin/segments Add new segment
     * @apiName Add segment
     * @apiDescription Add a new segment
     * @apiGroup Segments
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body
     * @apiParam {string} iconUrl . In body
     * @apiParam {string} bannerUrl . In body
     * @apiParam {string} isSchool . In body
     */

    app.post('/api/admin/segments', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        console.log(b);
        b.userId = req.headers.userid;

        var addSegments = function () {
            var defer = Q.defer();
            var segment = new Segment();
            segment.name = b.name;
            segment.iconUrl = b.iconUrl;
            segment.bannerUrl = b.bannerUrl;
            segment.isSchool = b.isSchool;
            segment.timestamp = U.getTimeStamp();

            segment.save(function (err, data) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
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
        addSegments()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
          * @api {get} /api/admin/segments Get All Segmnts
          * @apiName Get Segments
          * @apiDescription Get All Segments || Search an Segments || filter by date or isActive 
          * @apiGroup Segments
          * @apiParam {string} userId . In Header
          * @apiParam {string} authToken . In Header
          * @apiParam {string} apiKey . In Header
          * @apiParam {string} version . In Header
          * @apiParam {string} pageNumber . In Query Param
          * @apiParam {string} pageSize . In Query Param
         S * @apiParam {string} isActive . In Query param
          * @apiParam {string} isSchool . In Query param
        */

    app.get('/api/admin/segments', function (req, res) {
        var out;
        var b = {};
        b.fromDate = req.query.fromDate == undefined ? '' : req.query.fromDate;
        b.toDate = req.query.toDate == undefined ? '' : req.query.toDate;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.isSchool = req.query.isSchool == undefined ? '' : req.query.isSchool;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var getSegmentCount = function () {
            var defer = Q.defer();
            var query = Segment.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.isSchool != '')
                query = query.where('isSchool').equals(b.isSchool)
            if (b.fromDate != '')
                query = query.where('createdAt').gte(b.fromDate).lte(b.toDate);

            query.count().exec(function (err, segmentCount) {
                if (!err) {
                    b.segmentCount = segmentCount;
                    defer.resolve(segmentCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllSegments = function (segmentCount) {
            var defer = Q.defer();
            var query = Segment.find({
                isDeleted: false
            });
            if (b.keyword != '')
                query = Segment.find({
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
            if (b.fromDate != '')
                query = query.where('createdAt').gte(b.fromDate).lte(b.toDate);

            query.sort({
                createdAt: -1
            }).skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, segments) {
                if (!err) {
                    if (segments == null || segments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, segments, err, U.getPaginationObject(segmentCount, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getSegmentCount()
            .then(function (segmentCount) {
                return getAllSegments(segmentCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {put} /api/admin/segments/:id Update Segments
     * @apiName Update Segments
     * @apiDescription Update Segments
     * @apiGroup Segments
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is sgment id) In params
     * @apiParam {string} name . In Body
     * @apiParam {string} image . In Body
     * @apiParam {string} isActive . In Body 
     * @apiParam {string} isDeleted . In Body 
     */

    app.put('/api/admin/segments/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.segmentId = req.params.id;
        b.userId = req.headers.userid;
        var findSegments = function () {
            var defer = Q.defer();
            Segment.find({
                _id: b.segmentId
            }, function (err, segments) {
                if (!err) {
                    if (segments == null && segments.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No Segments found', b);
                        defer.reject(out);
                    } else {
                        defer.resolve(segments);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateSegment = function (segments) {
            var defer = Q.defer();
            if (b.name == undefined) {
                name = segments[0].name;
            } else {
                name = b.name;
            }
            if (b.iconUrl == undefined) {
                iconUrl = segments[0].iconUrl;
            } else {
                iconUrl = b.iconUrl;
            }
            if (b.bannerUrl == undefined) {
                bannerUrl = segments[0].bannerUrl;
            } else {
                bannerUrl = b.bannerUrl;
            }
            if (b.isActive == undefined) {
                isActive = segments[0].isActive;
            } else {
                isActive = b.isActive;
            }
            if (b.isDeleted == undefined) {
                isDeleted = segments[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }
            updatedById = b.userId;
            Segment.findByIdAndUpdate({
                _id: b.segmentId
            }, {
                $set: {
                    "name": name,
                    "bannerUrl": bannerUrl,
                    "iconUrl": iconUrl,
                    "isActive": isActive,
                    "isDeleted": isDeleted,
                    "updatedById": updatedById
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
        findSegments()
            .then(function (segments) {
                return updateSegment(segments)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });


    /**
     * @api {get} /api/admin/segments/:id Get segments by id
     * @apiName Get segments by id
     * @apiDescription Get segments by id
     * @apiGroup Segments
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is segment id )
     */

    app.get('/api/admin/segments/:id', function (req, res) {
        var out;
        var b = {};
        b.segmentId = req.params.id;
        var getSegmentById = function (subjectCount) {
            var defer = Q.defer();
            Segment.find({
                _id: b.segmentId
            }).exec(function (err, segments) {
                if (!err) {
                    if (segments == null && segments.length == 0) {
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
     * @api {get} /api/boards Get All Boards 
     * @apiName Get All Boards 
     * @apiDescription Get All Boards 
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
     *      "_id": "59f6f9c74b96af0004b66e71",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
     *       "name": "UP Board"
     *   },
     *   {
     *       "_id": "59f706b2a60ca20004bd463a",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
     *       "name": "CBSE"
     *   },
     *   {
     *       "_id": "59f72435a7a3140004d88f63",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
     *       "name": "MP Board"
     *   }
     *   ],
     *   "paginate": {},
     *   "error": {}
     *   }
     */

    app.get('/api/boards', function (req, res) {
        var out;
        var b = {};
        var getAllBoards = function () {
            var defer = Q.defer();
            Segment.find({
                isActive: true,
                isSchool: true,
                isDeleted: false
            }, {
                _id: 1,
                name: 1,
                bannerUrl: 1,
                iconUrl: 1
            }).exec(function (err, boards) {
                if (!err) {
                    if (boards == null || boards.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, boards);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllBoards()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/streams Get All Competetion exam 
     * @apiName Get All Competetion exam  
     * @apiDescription Get All Competetion exam  
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
     *       "_id": "59f706eba60ca20004bd463c",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
     *       "name": "Olympiad"
     *   },
     *   {
     *       "_id": "59f75ee5e04133000443c9b3",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
     *       "name": "Public Sector"
     *   },
     *   {
     *       "_id": "59fefe5737ae9900043a32de",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/school",
     *       "name": "Engg"
     *   },
     *   {
     *       "_id": "5a02995c8eff60000487bf2e",
     *       "bannerUrl": "http://loremflickr.com/600/400/school",
     *       "iconUrl": "",
     *       "name": "Test career 8"
     *   }
     *   ],
     *   "paginate": {},
     *   "error": {}
     *   }
     */

    app.get('/api/streams', function (req, res) {
        var out;
        var b = {};
        var getAllCompetetion = function () {
            var defer = Q.defer();
            Segment.find({
                isActive: false,
                isSchool: false,
                isDeleted: false
            }, {
                _id: 1,
                name: 1,
                bannerUrl: 1,
                iconUrl: 1
            }).exec(function (err, competetions) {
                if (!err) {
                    if (competetions == null || competetions.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, competetions);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllCompetetion()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}