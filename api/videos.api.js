
var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var Video = require('./../models/videos.model');
var J = require('./../share/comman.methods');
var Topic = require('./../models/topics.model');

module.exports = function (app) {

    /**
     * @api {post} /api/admin/videos Add new video
     * @apiName Add video
     * @apiDescription Add a new video
     * @apiGroup videos
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} topicIds *. In body .Array of objectIds
     * @apiParam {string} subjectId *. In body .objectId
     * @apiParam {string} title *. In body
     * @apiParam {string} description . In body
     * @apiParam {string} duration *. In body 1:23:44 (hh:mm:ss)
     * @apiParam {string} thumbUrl * . In body
     * @apiParam {string} videoType *. In body VIDEO_TYPE_HOSTED, VIDEO_TYPE_YOUTUBE, VIDEO_TYPE_VIMEO
     * @apiParam {string} videoUrl * . In body
     * @apiParam {string[]} tags . In body ['newton','force']
     */

    app.post('/api/admin/videos', function (req, res) {
        var out;
        var b;
        try {
            b = JSON.parse(req.body.body);
        } catch (e) {
            b = req.body;
        }
        // console.log("video add : " + JSON.stringify(b));
        b.userId = req.headers.userid;
        if (!b.topicIds || b.topicIds.length == 0) {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Please provide topic detail', b);
            res.json(out);
            return;
        }
        var findItem = function () {
            var d = Q.defer();
            Topic.find({
                _id: {
                    $in: b.topicIds.map(function (o) {
                        return Mongoose.Types.ObjectId(o);
                    })
                },
                isDeleted: false
            }, function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems selected topic doesn't exist", b);
                        d.reject(out);
                    } else {
                        d.resolve(data);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    d.reject(out);
                }
            })
            return d.promise;
        };

        var addItem = function () {
            var d = Q.defer();
            var item = new Video();
            item.title = b.title;
            item.description = b.description;
            item.segmentIds = b.segmentIds;
            item.subSegmentIds = b.subSegmentIds;
            item.chapterIds = b.chapterIds;
            item.unitIds = b.unitIds;
            item.subject = b.subjectId;
            item.topics = b.topicIds;
            item.videoType = b.videoType;
            item.thumbUrl = b.thumbUrl;
            item.videoUrl = b.videoUrl;
            item.timestamp = U.getTimeStamp();
            item.createdById = b.userId;
            item.updatedById = b.userId;
            item.tags = b.tags;
            item.duration = b.duration;
            hours = b.duration.hours != 0 ? b.duration.hours + "h " : '';
            minutes = b.duration.minutes != 0 ? b.duration.minutes + "m " : '';
            seconds = b.duration.seconds != 0 ? b.duration.seconds + "s " : '';
            item.durationToDisplay = hours + minutes + seconds;

            item.save(function (err, data) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                    d.resolve(out);
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Seems this data already exist !', b);
                        d.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };
        findItem()
            .then(function (topics) {
                b.segmentIds = topics.map(function (t) {
                    return t.segments;
                });
                b.subSegmentIds = topics.map(function (t) {
                    return t.subSegments;
                })
                b.unitIds = topics.map(function (t) {
                    return t.units;
                });
                b.chapterIds = topics.map(function (t) {
                    return t.chapters;
                })
                return addItem();
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
       * @api {get} /api/admin/videos Get all videos (Admin)
       * @apiName Get Videos
       * @apiDescription Get all videos || Filter by fields for admin
       * @apiGroup Videos
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
       * @apiParam {string} videoType . In Query param (VIDEO_TYPE_HOSTED, VIDEO_TYPE_YOUTUBE, VIDEO_TYPE_VIMEO)
       */
    app.get('/api/admin/videos', function (req, res) {
        var out;
        var b = {};
        b.fromDate = req.query.fromDate == undefined ? '' : req.query.fromDate;
        b.toDate = req.query.toDate == undefined ? '' : req.query.toDate;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;
        b.topicIds = req.query.topicIds == undefined ? '' : req.query.topicIds;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var query = Video.find(
            {
                isDeleted: false
            },
            {
                _id: 1,
                createdAt: 1,
                videoUrl: 1,
                thumbUrl: 1,
                videoType: 1,
                subject: 1,
                topics: 1,
                title: 1,
                timestamp: 1,
                isActive: 1
            }
        );
        if (b.keyword != '')
            query = Video.find({
                "name": {
                    "$regex": b.keyword,
                    '$options': 'i'
                },
                isDeleted: false
            })
        if (b.isActive != '')
            query = query.where('isActive').equals(b.isActive)
        if (b.fromDate != '')
            query = query.where('createdAt').gte(b.fromDate).lte(b.toDate);
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
        var getItemCount = function () {
            var d = Q.defer();
            query.count().exec(function (err, itemCount) {
                if (!err) {
                    b.itemCount = itemCount;
                    d.resolve(itemCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    d.reject(out);
                }
            });
            return d.promise;
        };
        var getAllItems = function (itemCount) {
            var d = Q.defer();
            //  Convert type of query to find (again)
            query.find();
            query.lean();
            query.sort({
                createdAt: -1
            })
                .populate("segments subsegments subject topics", "name iconUrl")
                .skip(pageOptions.limit * (pageOptions.page - 1))
                .limit(pageOptions.limit)
                .exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            d.reject(out);
                        } else {

                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data, err, U.getPaginationObject(itemCount, b.pageSize, b.pageNumber));
                            d.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        d.reject(out);
                    }
                })
            return d.promise;
        };
        getItemCount()
            .then(function (itemCount) {
                return getAllItems(itemCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {put} /api/admin/videos/:id Update videos (Admin)
     * @apiName Update videos
     * @apiDescription Update videos
     * @apiGroup videos
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In params - videoId to update
     * @apiParam {string} topicIds *. In body .Array of objectIds
     * @apiParam {string} title *. In body
     * @apiParam {string} description . In body
     * @apiParam {string} duration *. In body 1:23:44 (hh:mm:ss)
     * @apiParam {string} thumbUrl * . In body
     * @apiParam {string} videoType *. In body VIDEO_TYPE_HOSTED, VIDEO_TYPE_YOUTUBE, VIDEO_TYPE_VIMEO
     * @apiParam {string} videoUrl * . In body
     * @apiParam {string[]} tags . In body ['newton','force']
     * @apiParam {string} isActive . In Body 
     * @apiParam {string} isDeleted . In Body 
     */

    app.put('/api/admin/videos/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.id = req.params.id;
        b.userId = req.headers.userid;

        var findItem = function () {
            var d = Q.defer();
            Video.find({
                _id: b.id
            }, function (err, data) {
                if (!err) {
                    if (data == null || data.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        d.reject(out);
                    } else {
                        d.resolve(data);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    d.reject(out);
                }
            })
            return d.promise;
        };
        var updateItem = function (items) {
            var d = Q.defer();
            var i = items[0];
            title = b.title ? b.title : i.title;
            description = b.description ? b.description : i.description;
            thumbUrl = b.thumbUrl ? b.thumbUrl : i.thumbUrl;
            videoType = b.videoType ? b.videoType : i.videoType;
            videoUrl = b.videoUrl ? b.videoUrl : i.videoUrl;
            topicIds = b.topicIds && b.topicIds.length > 0 ? b.topicIds : i.topics;
            tags = b.tags && b.tags.length > 0 ? b.tags : i.tags;
            isActive = b.isActive == undefined ? i.isActive : b.isActive;
            if (b.isDeleted == undefined) {
                isDeleted = i.isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    title = U.getDeletedName(title);
                }
                isDeleted = b.isDeleted;
            }
            updatedById = b.userId;
            Video.findByIdAndUpdate({
                _id: b.id
            }, {
                    $set: {
                        "title": title,
                        "description": description,
                        "thumbUrl": thumbUrl,
                        "videoType": videoType,
                        "videoUrl": videoUrl,
                        "topics": topicIds,
                        "tags": tags,
                        "isActive": isActive,
                        "isDeleted": isDeleted,
                        "updatedById": updatedById
                    }
                }, {
                    lean: true,
                    new: true
                }, function (err, data) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                        d.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        d.reject(out);
                    }
                });
            return d.promise;
        };
        findItem()
            .then(function (data) {
                return updateItem(data)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/videos/:id Get videos by id
     * @apiName Get videos by id
     * @apiDescription Get videos by id
     * @apiGroup videos
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is video id )
     */

    app.get('/api/admin/videos/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        var findItemById = function (itemCount) {
            var d = Q.defer();
            Video.find({
                _id: b.id
            },
                {
                    createdAt: 1,
                    durationToDisplay: 1,
                    timestamp: 1,
                    videoUrl: 1,
                    thumbUrl: 1,
                    videoType: 1,
                    subject: 1,
                    description: 1,
                    title: 1,
                    isActive: 1,
                    tags: 1,
                    duration: 1,
                    topics: 1

                })
                .populate("subject topics", "name iconUrl")
                .exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                            d.reject(out);
                        } else {
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                            d.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        d.reject(out);
                    }
                })
            return d.promise;
        };
        findItemById()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
       * @api {get} /api/subjects/:subjectId/videos Get all videos
       * @apiName Get Videos
       * @apiDescription Get all videos by subject
       * @apiGroup Mobile
       * @apiParam {string} userId . In Header
       * @apiParam {string} authToken . In Header
       * @apiParam {string} apiKey . In Header
       * @apiParam {string} version . In Header
       * @apiParam {string} pageNumber . In Query param pageNumber=1
       * @apiParam {string} pageSize . In Query param &pageSize=30
       * @apiParam {string} subjectId . In path 59f70721a60ca20004bd463e
       */
    app.get('/api/subjects/:subjectId/videos', function (req, res) {
        var out;
        var b = {};
        b.subjectId = req.params.subjectId;
        b.userId = req.headers.userid;
        var userDetail = {};
        if (!b.subjectId || b.subjectId == '') {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Subject id is required", b);
            res.json(out);
            return;
        }

        var getAllItems = function (subjectId, userId) {
            var d = Q.defer();
            Video.aggregate([{
                $match: {
                    "subject": Mongoose.Types.ObjectId(subjectId),
                    "isDeleted": false,
                    "isActive": true
                }
            },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    videoUrl: 1,
                    thumbUrl: 1,
                    videoType: 1,
                    subject: 1,
                    title: 1,
                    timestamp: 1,
                    duration: 1,
                    description: 1,
                    durationToDisplay: 1,
                    isWatched: { $in: [Mongoose.Types.ObjectId(userId), "$userIds"] }
                }
            }
            ],
                function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            d.reject(out);
                        } else {

                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data, err);
                            d.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        d.reject(out);
                    }
                })
            return d.promise;
        };
        J.verifyUser(b.userId)
            .then(function (user) {
                userDetail = user;
                return getAllItems(b.subjectId, b.userId)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/videos/:id/watch Mark videos as watched
     * @apiName Mark videos as watched
     * @apiDescription Mark videos as watched
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is video id )
     */

    app.get('/api/videos/:id/watch', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        b.userId = req.headers.userid;
        var userDetail = {};
        var updateItem = function (videoId, userId) {
            var d = Q.defer();
            Video.findByIdAndUpdate({
                _id: videoId
            }, {
                    $addToSet: {
                        "userIds": Mongoose.Types.ObjectId(userId)
                    }
                }, {
                    lean: true,
                    new: true
                }, function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA)
                            d.reject(out);
                        } else {
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data);
                            d.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        d.reject(out);
                    }
                })
            return d.promise;
        };
        J.verifyUser(b.userId)
            .then(function (user) {
                userDetail = user;
                return updateItem(b.id, b.userId);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}