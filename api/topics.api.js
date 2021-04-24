var U = require('./../share/util.api');
var J = require('./../share/comman.methods');
var C = require('./../constant');
var Mongoose = require('mongoose');
var Topic = require('./../models/topics.model');
var Chapter = require('./../models/chapters.model');
var ObjectId = Mongoose.Schema.Types.ObjectId;
var request = require('request');
var Q = require('q');
var Summary = require('./../models/practiceSummery.model');
var _ = require('underscore')._;
module.exports = function (app) {

    /**
     * @api {post} /api/admin/topics Add new topic
     * @apiName Add topic
     * @apiDescription Add a new topic
     * @apiGroup Topics
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body 
     * @apiParam {array} chapterIds .In body
     * @apiParam {string} iconUrl . In body 
     * @apiParam {string} bannerUrl . In body 
     * @apiParamExample {json} Request-Example:
     * {
     * "chapter":"59ef2b4ec0a41b5f2c6fc666",
     * "name": "chiru"
     * }
     */

    app.post('/api/admin/topics', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        //console.log('data from input', b);
        var objeArr = [];
        var chapterData;
        var validateChapter = function () {
            var defer = Q.defer();
            Chapter.find({
                _id: {
                    $in: b.chapterIds
                }
            }, function (err, chapter) {
                if (!err) {
                    if (chapter != null || chapter.length > 0) {
                        defer.resolve(chapter);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'please provide correct chapterId', b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var findTopic = function () {
            var defer = Q.defer();
            Topic.aggregate([{
                $match: {
                    "name": b.name,
                    "chapters": {
                        $in: b.chapterIds.map(function (o) {
                            return Mongoose.Types.ObjectId(o);
                        })
                    },
                    "isDeleted": false,
                }
            }]).exec(function (err, topic) {
                if (!err) {
                    defer.resolve(topic);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        }
        var addTopic = function () {
            var defer = Q.defer();
            var topic = new Topic();
            topic.name = b.name;
            topic.createdAt = new Date;
            topic.updatedAt = new Date;
            topic.subjects = chapterData[0].subject;
            topic.units = chapterData[0].units;
            topic.chapters = b.chapterIds;
            topic.segments = chapterData[0].segments;
            topic.subSegments = chapterData[0].subSegments;
            topic.createdBy = b.userId;
            topic.iconUrl = b.iconUrl;
            topic.bannerUrl = b.bannerUrl;
            topic.timestamp = U.getTimeStamp();
            objeArr.push(topic);
            Topic.insertMany(objeArr, function (err, data) {
                if (!err) {
                    //out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                    defer.resolve(data);
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Chapter name already exist.', b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        validateChapter()
            .then(function (data) {
                if (data != null || data.length > 0) {
                    chapterData = data;
                    return findTopic();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "seems this chapter does't exist", b);
                    res.json(out);
                }
            })
            .then(function (topic) {
                if (topic == null || topic.length == 0) {
                    return addTopic();
                } else {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Seems data already exist !', topic);
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
     * @api {get} /api/admin/chapters/:chapterId/topics Get All topics with filters
     * @apiName Get topics
     * @apiDescription Get All topics with all filters and search by name
     * @apiGroup Topics
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} keyword . In Query param. Name
     * @apiParam {string} isActive . In Query param. (true||false)
     * @apiParam {string} subjectIds . In Query param. 
     * @apiParam {string} chapterId . In url.
     * @apiParam {string} segmentIds. In Query param. 
     * @apiParam {string} subSegmentIds . In Query param.
     */

    app.get('/api/admin/chapters/:chapterId/topics', function (req, res) {
        var out;
        var b = {};
        b.chapterId = req.params.chapterId;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;
        b.segment = req.query.segmentIds == undefined ? '' : req.query.segmentIds;
        b.subSegment = req.query.subSegmentIds == undefined ? '' : req.query.subSegmentIds;
        b.subject = req.query.subjectIds == undefined ? '' : req.query.subjectIds;

        var pageOptions = {
            page: parseInt(b.pageNumber) || C.PAGINATION_DEFAULT_PAGE_NUMBER,
            limit: parseInt(b.pageSize) || C.PAGINATION_DEFAULT_PAGE_SIZE
        }

        var getTopicCount = function () {
            var defer = Q.defer();
            var query = Topic.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.segment != '')
                query = query.where('segments').in([Mongoose.Types.ObjectId(b.segment)])
            if (b.subSegment != '')
                query = query.where('subSegments').in([Mongoose.Types.ObjectId(b.subSegment)])
            if (b.subject != '')
                query = query.where('subjects').in([Mongoose.Types.ObjectId(b.subject)])
            if (b.chapterId != '')
                query = query.where('chapters').in([Mongoose.Types.ObjectId(b.chapterId)])

            query.count().exec(function (err, topicCount) {
                if (!err) {
                    b.topicCount = topicCount;
                    defer.resolve(topicCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllTopic = function (topicCount) {
            var defer = Q.defer();
            var query = Topic.find({
                isDeleted: false
            });
            if (b.keyword != '')
                query = Topic.find({
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
            if (b.subject != '')
                query = query.where('subjects').in([Mongoose.Types.ObjectId(b.subject)])
            if (b.chapterId != '')
                query = query.where('chapters').in([Mongoose.Types.ObjectId(b.chapterId)])

            query.sort({
                createdAt: -1
            }).populate('segments subSegments subjects chapters units', '_id name isDeleted').skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                        defer.reject(out);
                    } else {
                        var activeItems = [];
                        data.forEach(function (doc, i) {
                            // if (doc.subject && !doc.subject.isDeleted) {
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
                            // }
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeItems, err, U.getPaginationObject(topicCount, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getTopicCount()
            .then(function (topicCount) {
                return getAllTopic(topicCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/topics  Get All topics
     * @apiName Get topics
     * @apiDescription Get All topics without chapter id || Search a chapter || filter by date or isActive 
     * @apiGroup Chapters
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query param pageNumber=1
     * @apiParam {string} pageSize . In Query param &pageSize=30
     * @apiParam {string} segmentIds . In Query param &segmentIds=59f706b2a60ca20004bd463a|59fefe4937ae9900043a32dd
     * @apiParam {string} subSegmentIds . In Query param &subSegmentIds=59f706c0a60ca20004bd463b|59fefe6b37ae9900043a32df
     * @apiParam {string} subject    . In Query param subjectId=59f70721a60ca20004bd463e
     * @apiParam {string} unitIds . In Query param &unitIds=5a0c364edf483f484438e00a|5a0282ba580d78bc866b9314
     * @apiParam {string} chapterIds . In Query param &unitIds=5a0c364edf483f484438e00a|5a0282ba580d78bc866b9314
     * @apiParam {string} keyword . In Query param &keyword=force
     * @apiParam {boolean} isActive . true=> returns only active items
     */

    app.get('/api/admin/topics', function (req, res) {
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

        var query = Topic.find({
            isDeleted: false
        });
        if (b.subject)
            if (Mongoose.Types.ObjectId.isValid(b.subject))
                query.where("subjects").in([Mongoose.Types.ObjectId(b.subject)])
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
        var getTopicCount = function () {
            var defer = Q.defer();
            query.count().exec(function (err, topicCount) {
                if (!err) {
                    b.topicCount = topicCount;
                    defer.resolve(topicCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllTopic = function () {
            var defer = Q.defer();

            if (b.keyword && b.keyword != '') {
                query = query.find({
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    }
                },
                    {
                        new: true, //   Returns updated data
                        lean: true  //    Returns json instead of mongoose model
                    })
            }
            else {
                query.find();
            }

            query
                .lean()
                .populate('subjects subSegments segments units chapters', 'name isDeleted')
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
                                if (doc.subjects && doc.subjects.length > 0) {
                                    var activeSubjects = doc.subjects.filter(function (u) {
                                        return u.isDeleted == false;
                                    })
                                    if (activeSubjects && activeSubjects.length > 0) {
                                        //  Convert subject array to single object
                                        data[i].subject = activeSubjects[0];
                                        //  Delete subject array now
                                        delete data[i].subjects;
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
        getTopicCount()
            .then(function (chapterCount) {
                return getAllTopic();
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
     * @api {put} /api/admin/topics/:id Update topic 
     * @apiName Update topics
     * @apiDescription Update topics
     * @apiGroup Topics
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . (Id is chapter id)In params
     * @apiParam {string} name . In Body
     * @apiParam {string} isActive . In Body 
     * @apiParam {string} subSegmentIds . In Body sample :- subSegments:["",""]
     * @apiParam {string} segmentIds . In Body :- segments:["",""]
     * @apiParam {string} subjectIds . In Body  :- subjects:["",""]
     * @apiParam {string} unitIds . In Body  :- units:["",""]
     * @apiParam {string} chapterIds . In Body  :- chapter:["",""]
     * @apiParam {string} iconUrl . In body 
     * @apiParam {string} bannerUrl . In body 
     * @apiParam {string} isDeleted . In Body 
     */

    app.put('/api/admin/topics/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.topicId = req.params.id;
        var findTopic = function () {
            var defer = Q.defer();
            Topic.find({
                _id: b.topicId
            }, function (err, topics) {
                if (!err) {
                    if (!topics || topics.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        defer.resolve(topics);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateSubSegment = function (topics) {
            var defer = Q.defer();
            name = b.name ? b.name : topics[0].name;
            isActive = b.isActive ? b.isActive : topics[0].isActive;
            subSegments = b.subSegmentIds && b.subSegmentIds.length > 0 ? b.subSegmentIds : topics[0].subSegments;
            segments = b.segmentIds && b.segmentIds.length > 0 ? b.segmentIds : topics[0].segments;
            units = b.unitIds && b.unitIds.length > 0 ? b.unitIds : topics[0].units;
            chapters = b.chapterIds && b.chapterIds.length > 0 ? b.chapterIds : topics[0].chapters;
            subjects = b.subjectIds && b.subjectIds.length > 0 ? b.subjectIds : topics[0].subjects;
            iconUrl = b.iconUrl ? b.iconUrl : topics[0].iconUrl;
            bannerUrl = b.bannerUrl ? b.bannerUrl : topics[0].bannerUrl;
            if (b.isDeleted == undefined) {
                isDeleted = topics[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }

            Topic.findByIdAndUpdate({
                _id: b.topicId
            }, {
                    $set: {
                        "name": name,
                        "isActive": isActive,
                        "isDeleted": isDeleted,
                        "subSegments": subSegments,
                        "segments": segments,
                        "subjects": subjects,
                        "units": units,
                        "chapters": chapters,
                        "iconUrl": iconUrl,
                        "bannerUrl": bannerUrl
                    }
                }, {
                    upsert: true
                }, function (err, topics) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, topics);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                });
            return defer.promise;
        };
        findTopic()
            .then(function (topics) {
                return updateSubSegment(topics);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/subjects/topics Get All topics by subjectId
     * @apiName Get topic
     * @apiDescription Get All topics by subjectId
     * @apiGroup Topics
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In query param Id id subject id
     * @apiParam {string} pageNumber . In Query param
     * @apiParam {string} pageSize . In Query param
     */

    app.get('/api/admin/subjects/topics', function (req, res) {
        var out;
        var b = {};
        b.subjectId = req.query.id;
        b.pageNumber = req.query.pageNumber;
        b.pageSize = req.query.pageSize;
        var pageOptions = {
            page: parseInt(b.pageNumber) || C.PAGINATION_DEFAULT_PAGE_NUMBER,
            limit: parseInt(b.pageSize) || C.PAGINATION_DEFAULT_PAGE_SIZE
        }

        var getTopicCount = function () {
            var defer = Q.defer();
            var query = Topic.find({});
            query = query.where('isActive').equals(1)

            query.count().exec(function (err, topicCount) {
                if (!err) {
                    b.topicCount = topicCount;
                    defer.resolve(topicCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getTopicBySubject = function (topicCount) {
            var defer = Q.defer();
            var query = '';
            if (b.subjectId == undefined || b.subjectId == '') {
                query = Topic.aggregate([{
                    $unwind: "$subject"
                },
                {
                    $match: {
                        isDeleted: false
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        createdBy: 1,
                        timestamp: 1,
                        updatedBy: 1,
                    }
                },
                {
                    $addFields: {
                        proficiency: 60

                    }
                }
                ]);
            } else {
                query = Topic.aggregate([{
                    $unwind: "$subject"
                },
                {
                    $match: {
                        subject: Mongoose.Types.ObjectId(b.subjectId),
                        isActive: 1
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        createdBy: 1,
                        timestamp: 1,
                        updatedBy: 1,
                    }
                },
                {
                    $addFields: {
                        proficiency: 60

                    }
                }
                ]);
            }

            query.skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, topics) {
                if (!err) {
                    if (topics != null && topics.length > 0) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, topics, err, U.getPaginationObject(topicCount, pageOptions.limit, pageOptions.page));
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getTopicCount()
            .then(function (topicCount) {
                return getTopicBySubject(topicCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


    /**
     * @api {get} /api/admin/topics/:id/subsegments Get Subsegments by chapterId
     * @apiName Get Subsegments by chapterId
     * @apiDescription Get Subsegments of an chapter by chapterId
     * @apiGroup Topics
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In query param Id id chapter id
     */

    app.get('/api/admin/topics/:id/subsegments', function (req, res) {
        var out;
        var b = req.params;
        var getSubsegments = function () {
            var defer = Q.defer();
            var subSegmentsArr = [];
            Topic.find({
                _id: b.id
            }, {
                    subSegments: 1
                }).populate('subSegments').exec(function (err, subsegments) {
                    if (!err) {
                        if (subsegments != null && subsegments.length > 0) {
                            for (var i = 0; i < subsegments[0].subSegments.length; i++) {
                                var subsegmentObj = {};
                                subsegmentObj._id = subsegments[0].subSegments[i]._id;
                                subsegmentObj.name = subsegments[0].subSegments[i].name;
                                subSegmentsArr.push(subsegmentObj);
                            }
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, subSegmentsArr);
                            defer.resolve(out);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            defer.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getSubsegments()
            .then(function (subsegments) {
                res.json(out);
            })
            .then(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/admin/topics/:id Get Toipic by id
     * @apiName Get Toipic by id
     * @apiDescription Get Toipic by id
     * @apiGroup Topics
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In query param Id id topic id
     */

    app.get('/api/admin/topics/:id', function (req, res) {
        var out;
        var b = req.params;
        var findTopic = function () {
            var defer = Q.defer();
            Topic.find({
                _id: b.id
            }).populate('segments subSegments subjects chapters units', '_id name isDeleted').exec(function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
                        defer.reject(out);
                    } else {
                        var activeItems = [];
                        data.forEach(function (doc, i) {
                            // if (doc.subject && !doc.subject.isDeleted) {
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
                            // }
                        })
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, activeItems)
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        findTopic()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/chapters/:id/topics Get topics by chapter
     * @apiName Get topics by chapter
     * @apiDescription Get topics by chapter
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header              
     * @apiParam {string} id . In url - id is chapter id
     */

    app.get('/api/chapters/:id/topics', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        var topics = [];
        var getTopic = function () {
            var defer = Q.defer();
            Topic.aggregate([{
                $match: {
                    "chapters": {
                        $in: [Mongoose.Types.ObjectId(b.id)]
                    },
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
                $sort: { createdAt: 1 }
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
            ], function (err, topics) {
                if (!err) {
                    if (topics == null || topics.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {
                        defer.resolve(topics);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var getProficiency = function (userId, topicList) {
            var defer = Q.defer();
            Summary.aggregate([{
                $match: {
                    "topic": {
                        $in: topicList
                    },
                    "summaryType": "topic",
                    "userId": Mongoose.Types.ObjectId(userId),
                }
            },
            {
                $project: {
                    proficiency: "$summary.proficiency",
                    _id: 0,
                    topicId: "$topic"
                }
            }
            ],
                function (err, data) {
                    if (!err) {
                        if (data && data.length > 0) {
                            // console.log("prof data for subject : %j", data);
                            for (var i = 0; i < topics.length; i++) {
                                var s = topics[i];
                                // console.log("Matching subject %j", s);
                                var matchedData = _.find(data, function (d) {
                                    return d.topicId.equals(s._id);
                                });
                                if (matchedData && matchedData.proficiency)
                                    topics[i].proficiency = matchedData.proficiency;
                            }
                        }
                        defer.resolve(topics);
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
                return getTopic();
            })
            .then(function (data) {
                topics = data;
                var topicList = data.map(function (s) { return s._id });
                return getProficiency(b.userId, topicList);
            })
            .then(function (topics) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, topics);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}