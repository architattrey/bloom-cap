var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var J = require('./../share/comman.methods');
var ObjectId = Mongoose.Types.ObjectId;
var ExpressJoi = require('express-joi-validator');
var Unit = require('./../models/units.model');
var CONST = require('./../constant');
var Summary = require('./../models/practiceSummery.model');
var _ = require('underscore')._;
module.exports = function (app) {

    /**
     * @api {post} /api/admin/units Add new unit
     * @apiName Add unit
     * @apiDescription Add a new unit
     * @apiGroup Units
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body
     * @apiParam {string} segmentIds . In body "segmentIds": ["59f08a9da3e03c14d03ec0cb"],
     * @apiParam {string} subSegmentIds . In body "subSegmentIds": ["59f08a9da3e03c14d03ec0cb"],
     * @apiParam {string} subjectId . In body (objectId)
     * @apiParam {string} iconUrl . In body 
     * @apiParam {string} bannerUrl . In body 
     * @apiParam {string} score . In body 
     * @apiParamExample {json} Request-Example:
     *  {
     *  "name": "First Unit",
     *  "segmentIds": [
     *  "59f08a9da3e03c14d03ec0cb"
     *   ],
     *  "subSegmentIds": [
     *      "59f08a9da3e03c14d03ec0cb"
     *  ],
     *  "subjectId": "59c2179fb500ce0a946aa93f",
     *  "iconUrl": "url",
     *  "score":10
     *  }
     */

    app.post('/api/admin/units', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.userId = req.headers.userid;
        var findUnit = function () {
            var defer = Q.defer();
            Unit.aggregate([{
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
            ]).exec(function (err, unit) {
                if (!err) {
                    defer.resolve(unit);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var addUnit = function () {
            var defer = Q.defer();
            var unit = new Unit();
            if (!b.segmentIds || b.segmentIds.length == 0) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Segment can't be blank", b);
                defer.reject(out);
            }
            if (!b.subSegmentIds || b.subSegmentIds.length == 0) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "subSegments can't be blank", b);
                defer.reject(out);
            }
            if (b.subjectId == undefined || b.subjectId == '') {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Subject can't be blank", b);
                defer.reject(out);
            }
            unit.segments = b.segmentIds;
            unit.subSegments = b.subSegmentIds;
            unit.subject = b.subjectId;
            unit.createdBy = b.userId;
            unit.name = b.name;
            unit.name = b.name;
            unit.weightage = b.weightage;
            unit.timestamp = U.getTimeStamp();
            unit.iconUrl = b.iconUrl;
            unit.bannerUrl = b.bannerUrl;

            unit.save(function (err, data) {
                if (!err) {
                    defer.resolve(data._doc);
                } else {
                    //console.log("Error from save unit :", err.errors.name.message);
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Unit name already exist please go with other', b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        findUnit()
            .then(function (unit) {
                if (unit == null || unit.length == 0) {
                    return addUnit();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Seems data already exist !', unit);
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
     * @api {get} /api/admin/units Get All Unit
     * @apiName Get Unit
     * @apiDescription Get All Unit || Search an Unit || filter by date or isActive 
     * @apiGroup Units
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} isActive . In Query param
     * @apiParam {string} subjectId . In Query param
     * @apiParam {string} subSegmentId . In Query param
     * @apiParam {string} segmentId . In Query param
     * @apiParam {string} unitName . In Query param
     */

    app.get('/api/admin/units', function (req, res) {
        var out;
        var b = {};
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? CONST.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.subjectId = req.query.subjectId == undefined ? '' : req.query.subjectId;
        b.segmentId = req.query.segmentId == undefined ? '' : req.query.segmentId;
        b.subSegmentId = req.query.subSegmentId == undefined ? '' : req.query.subSegmentId;
        b.unitName = req.query.unitName == undefined ? '' : req.query.unitName;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }

        var getUnitCount = function () {
            var defer = Q.defer();
            var query = Unit.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.subjectId != '')
                query = query.where('subject').equals(Mongoose.Types.ObjectId(b.subjectId));
            if (b.subSegmentId != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegmentId)]);
            if (b.segmentId != '')
                query = query.where('segments').in([(Mongoose.Types.ObjectId(b.segmentId))]);

            query.count().exec(function (err, unitCount) {
                if (!err) {
                    b.unitCount = unitCount;
                    defer.resolve(unitCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllUnit = function (unitCount) {
            var defer = Q.defer();
            var query = Unit.find({
                isDeleted: false
            });
            if (b.unitName != '')
                query = Unit.find({
                    "name": {
                        "$regex": b.unitName,
                        '$options': 'i'
                    },
                    isDeleted: false
                })
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.subjectId != '')
                query = query.where('subject').equals(Mongoose.Types.ObjectId(b.subjectId));
            if (b.subSegmentId != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegmentId)]);
            if (b.segmentId != '')
                query = query.where('segments').in([(Mongoose.Types.ObjectId(b.segmentId))]);


            query.populate('subject subSegments segments', 'name isDeleted').sort({
                createdAt: -1
            }).skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, units) {
                if (!err) {
                    if (units == null || units.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        var activeUnit = [];
                        units.forEach(function (doc, i) {
                            if (doc.subject && !doc.subject.isDeleted) {
                                if (doc.subSegments) {
                                    var activeSubSegments = doc.subSegments.filter(function (s) {
                                        return s.isDeleted == false;
                                    })
                                    if (activeSubSegments.length != 0) {
                                        units[i].subSegments = activeSubSegments;
                                        if (doc.segments) {
                                            var activeSegments = doc.segments.filter(function (s) {
                                                return s.isDeleted == false;
                                            })
                                            if (activeSegments.length != 0) {
                                                units[i].segments = activeSegments;
                                            }
                                        }
                                        activeUnit.push(units[i]);
                                    }
                                }
                            }
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeUnit, err, U.getPaginationObject(activeUnit.length, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getUnitCount()
            .then(function (unitCount) {
                return getAllUnit(unitCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {post} /api/admin/getunits Get All Unit post
     * @apiName Get Segments
     * @apiDescription Get All Unit post
     * @apiGroup Units
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} isActive . In Query param
     * @apiParam {string} subjectId . In Query param
     * @apiParam {string} subSegmentIds . In body
     * @apiParam {string} segmentIds . In body
     * @apiParam {string} unitName . In Query param
     */

    app.post('/api/admin/getunits', function (req, res) {
        var out;
        // var b = {};
        // b.subjectId = req.query.subjectId == undefined ? '' : req.query.subjectId;
        // b.segmentId = req.query.segmentId == undefined ? '' : req.query.segmentId;
        // b.subSegmentId = req.query.subSegmentId == undefined ? '' : req.query.subSegmentId;
        // b.unitName = req.query.unitName == undefined ? '' : req.query.unitName;

        var b = {};
        var input = req.body;
        // console.log("input unit Body : " + JSON.stringify(input));
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? C.PAGINATION_DEFAULT_PAGE_NUMBER : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.segments = input.segmentIds && input.segmentIds.length > 0 ? JSON.parse(input.segmentIds) : '';
        b.subSegments = input.subSegmentIds && input.subSegmentIds.length > 0 ? JSON.parse(input.subSegmentIds) : '';
        b.subject = input.subject == undefined ? (input.subjectId == undefined ? '' : input.subjectId) : input.subject;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;
        // console.log("Fomattted unit Body : " + JSON.stringify(b));
        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var getAllUnit = function () {
            var defer = Q.defer();
            var query = Unit.find({
                isDeleted: false
            });
            if (b.unitName != '')
                query = Unit.find({
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    },
                    isDeleted: false
                })
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.segments != '')
                query = query.where('segments').in(b.segments.map(function (o) {
                    return Mongoose.Types.ObjectId(o);
                }))
            if (b.subSegments != '')
                query = query.where('subSegments').in(b.subSegments.map(function (o) {
                    return Mongoose.Types.ObjectId(o);
                }))
            if (b.subject != '')
                query = query.where('subject').in([Mongoose.Types.ObjectId(b.subject)])

            query.populate('subject subSegments segments', 'name isDeleted').sort({
                createdAt: -1
            }).skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, units) {
                if (!err) {
                    if (units == null || units.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {
                        var activeUnit = [];
                        units.forEach(function (doc, i) {
                            if (doc.subject && !doc.subject.isDeleted) {
                                if (doc.subSegments) {
                                    var activeSubSegments = doc.subSegments.filter(function (s) {
                                        return s.isDeleted == false;
                                    })
                                    if (activeSubSegments.length != 0) {
                                        units[i].subSegments = activeSubSegments;
                                        if (doc.segments) {
                                            var activeSegments = doc.segments.filter(function (s) {
                                                return s.isDeleted == false;
                                            })
                                            if (activeSegments.length != 0) {
                                                units[i].segments = activeSegments;
                                            }
                                        }
                                        activeUnit.push(units[i]);
                                    }
                                }
                            }
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeUnit, err, U.getPaginationObject(activeUnit.length, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllUnit()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });
    /**
     * @api {put} /api/admin/units/:id Update unit 
     * @apiName Update unit
     * @apiDescription Update unit
     * @apiGroup Units
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is unit id)In params
     * @apiParam {string} name . In Body
     * @apiParam {string} subjectId . In Body
     * @apiParam {string} score . In Body
     * @apiParam {string} subSegmentIds . In Body
     * @apiParam {string} segmentIds . In Body
     * @apiParam {string} iconUrl . In Body
     * @apiParam {string} bannerUrl . In body 
     * @apiParam {string} isActive .In Body
     * @apiParamExample {json} Request-Example:
     * {
     *   "name": "first",
     *   "iconUrl": "Not url",
     *   "isActive": true,
     *   "segmentIds": [
     *   "59f14b4a3658f6000499eab2"
     *   ],
     *   "subSegmentIds": [
     *     "59f17d9bd551da0004390d30"
     *   ],
     *   "score": 10,
     *   "subjectId": "59dc9083d3de5c47e08c1bdb"
     *   }
     */

    app.put('/api/admin/units/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.unitId = req.params.id;
        b.userId = req.headers.userid;
        var findItem = function () {
            var defer = Q.defer();
            Unit.find({
                _id: b.unitId
            }, function (err, units) {
                if (!err) {
                    if (units == null && units.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        defer.resolve(units);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateItem = function (units) {
            var defer = Q.defer();
            if (b.name == undefined) {
                name = units[0].name;
            } else {
                name = b.name;
            }
            if (b.weightage == undefined) {
                weightage = units[0].weightage;
            } else {
                weightage = b.weightage;
            }
            if (b.iconUrl == undefined) {
                iconUrl = units[0].iconUrl;
            } else {
                iconUrl = b.iconUrl;
            }
            if (b.bannerUrl == undefined) {
                bannerUrl = units[0].bannerUrl;
            } else {
                bannerUrl = b.bannerUrl;
            }
            if (b.subjectId == undefined) {
                subject = units[0].subject;
            } else {
                subject = b.subjectId;
            }
            if (b.isActive == undefined) {
                isActive = units[0].isActive;
            } else {
                isActive = b.isActive;
            }
            if (b.userId == undefined) {
                updatedBy = units[0].updatedBy;
            } else {
                updatedBy = b.userId;
            }
            if (b.score == undefined) {
                score = units[0].score;
            } else {
                score = b.score;
            }
            if (b.subSegmentIds == undefined) {
                subSegments = units[0].subSegments;
            } else {
                subSegments = b.subSegmentIds;
            }
            if (b.segmentIds == undefined) {
                segments = units[0].segments;
            } else {
                segments = b.segmentIds;
            }
            if (b.isDeleted == undefined) {
                isDeleted = units[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }
            Unit.findByIdAndUpdate({
                _id: b.unitId
            }, {
                    $set: {
                        "name": name,
                        "weightage": weightage,
                        "iconUrl": iconUrl,
                        "bannerUrl": bannerUrl,
                        "subject": subject,
                        "isActive": isActive,
                        "score": score,
                        "subSegments": subSegments,
                        "segments": segments,
                        "updatedBy": updatedBy,
                        "isDeleted": isDeleted
                    }
                }, {
                    upsert: true
                }, function (err, units) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, units);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        findItem()
            .then(function (units) {
                return updateItem(units);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            });
    });

    /**
     * @api {get} /api/admin/units/:id Get Unit by id
     * @apiName Get Unit by id
     * @apiDescription Get Unit by id
     * @apiGroup Units
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In query param Id id unit id
     */

    app.get('/api/admin/units/:id', function (req, res) {
        var out;
        var b = req.params;
        var findUnit = function () {
            var defer = Q.defer();
            Unit.find({
                _id: b.id
            }).populate('segments subSegments subject', '_id name').exec(function (err, unit) {
                if (!err) {
                    if (unit == null || unit.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, unit)
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        findUnit()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/subjects/:id/units Get Unit by subjectId
     * @apiName Get Unit by subjectId
     * @apiDescription Get Unit by subjectId
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In url id is subjectId
     */

    app.get('/api/subjects/:id/units', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        var units = [];
        var findUnit = function () {
            var defer = Q.defer();
            Unit.aggregate([{
                $match: {
                    "subject": Mongoose.Types.ObjectId(b.id),
                    "segments": {
                        $in: [Mongoose.Types.ObjectId(b.segmentId)]
                    },
                    "subSegments": {
                        $in: [Mongoose.Types.ObjectId(b.subSegmentId)]
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
            }, {
                $sort: { createdAt: -1 }
            }
            ]).exec(function (err, unit) {
                if (!err) {
                    if (unit == null || unit.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        defer.resolve(unit);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var getProficiency = function (userId, unitList) {
            var defer = Q.defer();
            Summary.aggregate([{
                $match: {
                    "unit": {
                        $in: unitList
                    },
                    "summaryType": "unit",
                    "userId": Mongoose.Types.ObjectId(userId),
                }
            },
            {
                $project: {
                    proficiency: "$summary.proficiency",
                    _id: 0,
                    unitId: "$unit"
                }
            }
            ],
                function (err, data) {
                    if (!err) {
                        if (data && data.length > 0) {
                            // console.log("prof data for subject : %j", data);
                            for (var i = 0; i < units.length; i++) {
                                var s = units[i];
                                // console.log("Matching subject %j", s);
                                var matchedData = _.find(data, function (d) {
                                    return d.unitId.equals(s._id);
                                });
                                if (matchedData && matchedData.proficiency)
                                    units[i].proficiency = matchedData.proficiency;
                            }
                        }
                        defer.resolve(units);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }
        J.verifyUser(b.userId)
            .then(function (user) {
                b.segmentId = user.segment;
                b.subSegmentId = user.subSegment;
                return findUnit();
            })
            .then(function (data) {
                units = data;
                var unitList = data.map(function (s) { return s._id });
                return getProficiency(b.userId, unitList);
            })
            .then(function (units) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, units);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


}