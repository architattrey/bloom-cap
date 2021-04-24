var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var J = require('./../share/comman.methods');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var Unit = require('./../models/units.model');
var ExpressJoi = require('express-joi-validator');
var Chapter = require('./../models/chapters.model');
var Summary = require('./../models/practiceSummery.model');
var _ = require('underscore')._;


module.exports = function (app) {

    /**
     * @api {post} /api/admin/chapters Add new chapter
     * @apiName Add chapter
     * @apiDescription Add a new chapter
     * @apiGroup Chapters
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body
     * @apiParam {string} iconUrl . In body 
     * @apiParam {string} bannerUrl . In body 
     * @apiParam {array} unitIds . In body 
     */

    app.post('/api/admin/chapters', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.userId = req.headers.userid;
        var unit;
        var validateUnit = function () {
            var defer = Q.defer();
            Unit.find({
                _id: {
                    $in: b.unitIds
                }
            }, function (err, units) {
                if (!err) {
                    defer.resolve(units);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var findChapter = function () {
            var defer = Q.defer();
            Chapter.aggregate([{
                $match: {
                    "name": b.name,
                    "units": {
                        $in: b.unitIds.map(function (o) {
                            return Mongoose.Types.ObjectId(o);
                        })
                    },
                    "isDeleted": false,
                }
            },]).exec(function (err, chapter) {
                if (!err) {
                    defer.resolve(chapter);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var addChapter = function () {
            var defer = Q.defer();
            var chapter = new Chapter();
            chapter.name = b.name;
            chapter.iconUrl = b.iconUrl;
            chapter.bannerUrl = b.bannerUrl;
            chapter.segments = unit[0].segments;
            chapter.subSegments = unit[0].subSegments;
            chapter.createdById = b.userId;
            chapter.subject = unit[0].subject;
            chapter.units = b.unitIds;
            chapter.timestamp = +new Date;

            chapter.save(function (err, data) {
                if (!err) {
                    defer.resolve(data);
                } else {
                    //console.log("Error from save unit :", err.errors.name.message);
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Chapter name already exist please go with other', b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        validateUnit()
            .then(function (data) {
                if (data != null || data.length > 0) {
                    unit = data;
                    return findChapter();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "seems this unit does't exist", b);
                    res.json(out);
                }
            })
            .then(function (chapter) {
                if (chapter == null || chapter.length == 0) {
                    return addChapter();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Seems data already exist !', chapter);
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
     * @api {get} /api/admin/units/:unitId/chapters  Get All chapter
     * @apiName Get chapters
     * @apiDescription Get All chapters || Search an chapter || filter by date or isActive 
     * @apiGroup Chapters
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} isActive . In Query param
     * @apiParam {string} subject . In Query param
     * @apiParam {string} segment . In Query param
     * @apiParam {string} unitId . In Query param
     * @apiParam {string} subSegment . In Query param
     */

    app.get('/api/admin/units/:unitId/chapters', function (req, res) {
        var out;
        var b = {};
        b.unitId = req.params.unitId;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.subject = req.query.subject == undefined ? '' : req.query.subject;
        b.segment = req.query.segment == undefined ? '' : req.query.segment;
        //b.segment = req.query.unitId == undefined ? '' : req.query.unitId;
        b.subSegment = req.query.subSegment == undefined ? '' : req.query.subSegment;
        b.keyword = req.query.chapterName == undefined ? '' : req.query.chapterName;
        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var getChapterCount = function () {
            var defer = Q.defer();
            var query = Chapter.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.subject != '')
                query = query.where('subject').equals(Mongoose.Types.ObjectId(b.subject));
            if (b.segment != '')
                query = query.where('segments').in([Mongoose.Types.ObjectId(b.segment)])
            if (b.subSegment != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegment)])
            if (b.unitId != '')
                query = query.where('units').in([Mongoose.Types.ObjectId(b.unitId)])

            query.count().exec(function (err, chapterCount) {
                if (!err) {
                    b.chapterCount = chapterCount;
                    defer.resolve(chapterCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllChapter = function (chapterCount) {
            var defer = Q.defer();
            var query = Chapter.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.subject != '')
                query = query.where('subject').equals(Mongoose.Types.ObjectId(b.subject));
            if (b.segment != '')
                query = query.where('segments').in([Mongoose.Types.ObjectId(b.segment)])
            if (b.subSegment != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegment)])
            if (b.unitId != '')
                query = query.where('units').in([Mongoose.Types.ObjectId(b.unitId)])

            if (b.keyword != '')
                query = Chapter.find({
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    }
                })

            query.populate('subject units subSegments segments updatedBy', 'name isDeleted').sort({
                createdAt: -1
            }).skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {
                        var activeItems = [];
                        data.forEach(function (doc, i) {
                            if (doc.subject && !doc.subject.isDeleted) {
                                if (doc.subSegments) {
                                    var activeSubSegments = doc.subSegments.filter(function (s) {
                                        return s.isDeleted == false;
                                    })
                                    if (activeSubSegments.length != 0) {
                                        data[i].subSegments = activeSubSegments;
                                        if (doc.segments) {
                                            var activeSegments = doc.segments.filter(function (s) {
                                                return s.isDeleted == false;
                                            })
                                            if (activeSegments.length != 0) {
                                                data[i].segments = activeSegments;
                                            }
                                        }
                                        activeItems.push(data[i]);
                                    }
                                }
                            }
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeItems, err, U.getPaginationObject(chapterCount, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getChapterCount()
            .then(function (chapterCount) {
                return getAllChapter(chapterCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/chapters  Get All chapter
     * @apiName Get chapters
     * @apiDescription Get All chapters without unit id || Search a chapter || filter by date or isActive 
     * @apiGroup Chapters
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
     * @apiParam {string} keyword . In Query param &keyword=force
     * @apiParam {boolean} isActive . true=> returns only active items
     */

    app.get('/api/admin/chapters', function (req, res) {
        var out;
        var b = req.query;
        b.userId = req.headers.userid;

        if (b.pageNumber) {
            try {
                b.pageNumber = parseInt(b.pageNumber)
            } catch (e) {
                b.pageNumber = 1;
            }
        } else b.pageNumber = 1;
        if (b.pageSize) {
            try {
                b.pageSize = parseInt(b.pageSize)
            } catch (e) {
                b.pageSize = C.PAGINATION_DEFAULT_MAX_PAGE_SIZE;
            }
        } else b.pageSize = C.PAGINATION_DEFAULT_MAX_PAGE_SIZE;

        var query = Chapter.find({
            isDeleted: false
        });
        if (b.subjectId)
            if (Mongoose.Types.ObjectId.isValid(b.subjectId))
                query.where("subject").equals(Mongoose.Types.ObjectId(b.subjectId))
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
            query = query.where('subSegments').in(
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
        var getChapterCount = function () {
            var defer = Q.defer();
            query.count().exec(function (err, chapterCount) {
                if (!err) {
                    b.chapterCount = chapterCount;
                    defer.resolve(chapterCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllChapter = function () {
            var defer = Q.defer();

            if (b.keyword && b.keyword != '') {
                query = query.find({
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    }
                })
            }
            else {
                query.find();
            }

            query.populate('subject units subSegments segments updatedBy', 'name isDeleted')
                .sort({
                    createdAt: -1
                }).skip(b.pageSize * (b.pageNumber - 1)).limit(b.pageSize)
                .exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                            defer.reject(out);
                        } else {
                            var activeItems = [];
                            data.forEach(function (doc, i) {
                                if (doc.subject && !doc.subject.isDeleted) {
                                    if (doc.units) {
                                        var activeUnits = doc.units.filter(function (u) {
                                            return u.isDeleted == false;
                                        })
                                        if (activeUnits.length != 0) {
                                            data[i].units = activeUnits;
                                            if (doc.subSegments) {
                                                var activeSubSegments = doc.subSegments.filter(function (s) {
                                                    return s.isDeleted == false;
                                                })
                                                if (activeSubSegments.length != 0) {
                                                    data[i].subSegments = activeSubSegments;
                                                    if (doc.segments) {
                                                        var activeSegments = doc.segments.filter(function (s) {
                                                            return s.isDeleted == false;
                                                        })
                                                        if (activeSegments.length != 0) {
                                                            data[i].segments = activeSegments;
                                                        }
                                                    }
                                                    activeItems.push(data[i]);
                                                }
                                            }
                                        }
                                    }
                                }
                            })
                            defer.resolve(activeItems);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getChapterCount()
            .then(function (chapterCount) {
                return getAllChapter();
            })
            .then(function (activeItems) {
                if (activeItems && activeItems.length > 0)
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeItems, null, U.getPaginationObject(activeItems.length, b.pageSize, b.pageNumber));
                else out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {put} /api/admin/chapters/:id Update chapter 
     * @apiName Update chapter
     * @apiDescription Update chapter
     * @apiGroup Chapters
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is chapter id)In params
     * @apiParam {string} name . In Body
     * @apiParam {string} isActive . In Body
     * @apiParam {string} unitIds . In Body
     * @apiParam {string} subSegmentIds . In Body
     * @apiParam {string} segmentIds . In Body
     * @apiParam {string} subjectId . In Body
     * @apiParam {string} iconUrl . In Body
     * @apiParam {string} bannerUrl . In body 
     * @apiParamExample {json} Request-Example:
     *   {
     *   "name": "kuch nahi",
     *   "iconUrl": "kuchnahi bhai bola tho tha!",
     *   "segmentIds": [
     *    "59eedb2d9d97e941c47148f7",
     *    "59eedb2d9d97e941c47148f7"
     *   ],
     *   "subSegmentIds": [
     *   "59eedb2d9d97e941c47148f7",
     *   "59eedb2d9d97e941c47148f7"
     *   ],
     *   "unitIds": [
     *   "59eedb2d9d97e941c47148f7",
     *   "59eedb2d9d97e941c47148f7"
     *   ],
     *   "subjectId": "59c217b0b500ce0a946aa940",
     *   "isActive":true
     *   }
     */

    app.put('/api/admin/chapters/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.chapterId = req.params.id;
        b.userId = req.headers.userid;
        var findChapter = function () {
            var defer = Q.defer();
            Chapter.find({
                _id: b.chapterId
            }, function (err, chapter) {
                if (!err) {
                    if (chapter == null && chapter.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {
                        defer.resolve(chapter);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateChapter = function (chapter) {
            var defer = Q.defer();
            if (b.name == undefined) {
                name = chapter[0].name;
            } else {
                name = b.name;
            }
            if (b.iconUrl == undefined) {
                iconUrl = chapter[0].iconUrl;
            } else {
                iconUrl = b.iconUrl;
            }
            if (b.bannerUrl == undefined) {
                bannerUrl = chapter[0].bannerUrl;
            } else {
                bannerUrl = b.bannerUrl;
            }
            if (b.subject == undefined) {
                subject = chapter[0].subject;
            } else {
                subject = b.subject;
            }
            if (b.isActive == undefined) {
                isActive = chapter[0].isActive;
            } else {
                isActive = b.isActive;
            }
            if (b.isDeleted == undefined) {
                isDeleted = chapter[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }
            if (b.userId == undefined) {
                updatedBy = chapter[0].updatedBy;
            } else {
                updatedBy = b.userId;
            }
            if (b.unitIds == undefined) {
                units = chapter[0].units;
            } else {
                units = b.unitIds;
            }
            if (b.subSegmentIds == undefined) {
                subSegments = chapter[0].subSegments;
            } else {
                subSegments = b.subSegmentIds;
            }
            if (b.segmentIds == undefined) {
                segments = chapter[0].segments;
            } else {
                segments = b.segmentIds;
            }
            Chapter.findByIdAndUpdate({
                _id: b.chapterId
            }, {
                    $set: {
                        "name": name,
                        "iconUrl": iconUrl,
                        "subject": subject,
                        "isActive": isActive,
                        "units": units,
                        "subSegments": subSegments,
                        "segments": segments,
                        "updatedBy": updatedBy,
                        "isDeleted": b.isDeleted ? b.isDeleted : chapter[0].isDeleted
                    }
                }, {
                    upsert: true
                }, function (err, chapter) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, chapter);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        findChapter()
            .then(function (chapter) {
                return updateChapter(chapter);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/chapters/:id Get Chapter by id
     * @apiName Get Chapter by id
     * @apiDescription Get Chapter by id
     * @apiGroup Chapters
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In query param Id id chapter id
     */

    app.get('/api/admin/chapters/:id', function (req, res) {
        var out;
        var b = req.params;
        var findChapter = function () {
            var defer = Q.defer();
            Chapter.find({
                _id: b.id
            }).populate('segments subSegments subject units', '_id name').exec(function (err, chapter) {
                if (!err) {
                    if (chapter == null || chapter.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, chapter)
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        findChapter()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/units/:id/chapters Get chapter by unitId
     * @apiName Get chapter by unitId
     * @apiDescription Get chapter by unitId
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In url - id is unit id sample value :- 59f701d5ffb4670004547131
     * @apiSuccessExample {json} Success-Response:
     *    {
     *   "status": C.STATUS_SUCCESS_CODE,
     *   "message": "success",
     *   "data": [
     *   {
     *       "_id": "59f70208ffb4670004547133",
     *       "name": "Chapter 1",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/item",
     *       "proficiency": 60
     *   },
     *   {
     *       "_id": "59f70224ffb4670004547134",
     *       "name": "Chapter 2-deletedOn-2017-10-30T17:47:09.936Z",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/item",
     *       "proficiency": 60
     *   },
     *   {
     *       "_id": "59f765b80220c0e17f408243",
     *       "name": "ch0-deletedOn-2017-10-30T17:47:41.553Z",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/item",
     *       "proficiency": 60
     *   },
     *   {
     *       "_id": "59f765d80220c0e17f408244",
     *       "name": "ch0-deletedOn-2017-10-30T17:51:14.041Z",
     *       "iconUrl": "http://loremflickr.com/C.STATUS_SUCCESS_CODE/C.STATUS_SUCCESS_CODE/item",
     *       "proficiency": 60
     *   }
     *   ],
     *   "paginate": {},
     *   "error": {}
     *   }
     */

    app.get('/api/units/:id/chapters', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        var chapters = [];
        var getChapter = function (user) {
            var defer = Q.defer();
            // console.log("Inside getChapter method", user)
            Chapter.aggregate([{
                $match: {
                    "units": {
                        $in: [Mongoose.Types.ObjectId(b.id)]
                    },
                    "segments": {
                        $in: [Mongoose.Types.ObjectId(user.segment)]
                    },
                    "subSegments": {
                        $in: [Mongoose.Types.ObjectId(user.subSegment)]
                    },
                    "isDeleted": false,
                    "isActive": true
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    iconUrl: 1
                }
            },
            {
                $addFields: {
                    proficiency: 0,
                }
            }
            ], function (err, chapters) {
                if (!err) {
                    if (chapters == null || chapters.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {
                        defer.resolve(chapters);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var getProficiency = function (userId, chapterList) {
            var defer = Q.defer();
            Summary.aggregate([{
                $match: {
                    "chapter": {
                        $in: chapterList
                    },
                    "summaryType": "chapter",
                    "userId": Mongoose.Types.ObjectId(userId),
                }
            },
            {
                $project: {
                    proficiency: "$summary.proficiency",
                    _id: 0,
                    chapterId: "$chapter"
                }
            }
            ],
                function (err, data) {
                    if (!err) {
                        if (data && data.length > 0) {
                            // console.log("prof data for subject : %j", data);
                            for (var i = 0; i < chapters.length; i++) {
                                var s = chapters[i];
                                // console.log("Matching subject %j", s);
                                var matchedData = _.find(data, function (d) {
                                    return d.chapterId.equals(s._id);
                                });
                                if (matchedData && matchedData.proficiency)
                                    chapters[i].proficiency = matchedData.proficiency;
                            }
                        }
                        defer.resolve(chapters);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        }
        J.verifyUser(b.userId)
            .then(function (user) {
                return getChapter(user);
            })
            .then(function (data) {
                chapters = data;
                var chapterList = data.map(function (s) { return s._id });
                return getProficiency(b.userId, chapterList);
            })
            .then(function (chapters) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, chapters);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}