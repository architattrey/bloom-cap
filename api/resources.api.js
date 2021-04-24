
var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var Resource = require('./../models/resources.model');
var Subject = require('./../models/subjects.model');

module.exports = function (app) {

    /**
     * @api {post} /api/admin/resources Add new resource
     * @apiName Add resource
     * @apiDescription Add a new resource/file
     * @apiGroup resources
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} subjectId *. In body .objectId
     * @apiParam {string[]} segmentIds *. In body
     * @apiParam {string[]} subSegmentIds *. In body
     * @apiParam {string} title *. In body
     * @apiParam {string} description . In body
     * @apiParam {string} thumbUrl * . In body
     * @apiParam {string} resourceType *. In body RESOURCE_TYPE_SAMPLE_PAPER, RESOURCE_TYPE_BOOK, RESOURCE_TYPE_OTHER
     * @apiParam {string} resourceUrl * . In body
     * @apiParam {string[]} tags . In body ['model-paper','IIT']
     */

    app.post('/api/admin/resources', function (req, res) {
        var out;
        var b;
        try {
            b = JSON.parse(req.body.body);
        } catch (e) {
            b = req.body;
        }
        // console.log("resource add : " + JSON.stringify(b));
        b.userId = req.headers.userid;
        var subjectDetail = {};
        if (!b.subjectId || b.subjectId == "") {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Please provide subject detail', b);
            res.json(out);
            return;
        }
        var findItem = function () {
            var d = Q.defer();
            Subject.find({
                _id: b.subjectId,
                isDeleted: false,
                isActive: true
            }, {
                    name: 1,
                    segments: 1,
                    subSegments: 1
                }, { lean: true }, function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems selected subject doesn't exist", b);
                            d.reject(out);
                        } else {
                            d.resolve(data[0]);
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
            var item = new Resource();
            item.title = b.title;
            item.description = b.description;
            item.segments = b.segmentIds;
            item.subSegments = b.subSegmentIds;
            item.subject = b.subjectId;
            item.resourceType = b.resourceType;
            item.thumbUrl = b.thumbUrl;
            item.resourceUrl = b.resourceUrl;
            item.tags = b.tags;
            item.timestamp = U.getTimeStamp();
            item.createdById = b.userId;
            item.updatedById = b.userId;

            item.save(function (err, data) {
                if (!err) {
                    b._id = data._id;
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, b);
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
            .then(function (subject) {
                subjectDetail = subject;
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
       * @api {get} /api/admin/resources Get all resources (Admin)
       * @apiName Get Resources
       * @apiDescription Get all resources || Filter by fields for admin
       * @apiGroup Resources
       * @apiParam {string} userId . In Header
       * @apiParam {string} authToken . In Header
       * @apiParam {string} apiKey . In Header
       * @apiParam {string} version . In Header
       * @apiParam {string} pageNumber . In Query param pageNumber=1
       * @apiParam {string} pageSize . In Query param &pageSize=30
       * @apiParam {string} segmentIds . In Query param &segmentIds=59f706b2a60ca20004bd463a|59fefe4937ae9900043a32dd
       * @apiParam {string} subSegmentIds . In Query param &subSegmentIds=59f706c0a60ca20004bd463b|59fefe6b37ae9900043a32df
       * @apiParam {string} subjectId . In Query param subjectId=59f70721a60ca20004bd463e
       * @apiParam {string} resourceType *. In body RESOURCE_TYPE_SAMPLE_PAPER, RESOURCE_TYPE_BOOK, RESOURCE_TYPE_OTHER
       */
    app.get('/api/admin/resources', function (req, res) {
        var out;
        var b = {};
        b.fromDate = req.query.fromDate == undefined ? '' : req.query.fromDate;
        b.toDate = req.query.toDate == undefined ? '' : req.query.toDate;
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.keyword = req.query.keyword == undefined ? '' : req.query.keyword;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var query = Resource.find(
            {
                isDeleted: false
            },
            {
                isDeleted: 0,
                tags: 0,
                updatedAt: 0,
                updatedById: 0,
                createdById: 0,
                __v: 0
            }
        );
        if (b.keyword != '')
            query = Resource.find({
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
                .populate("segments subsegments subject", "name iconUrl")
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
     * @api {put} /api/admin/resources/:id Update resources (Admin)
     * @apiName Update resources
     * @apiDescription Update resources
     * @apiGroup resources
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In params - resourceId to update
     * @apiParam {string} subjectId *. In body (not allowed)
     * @apiParam {string[]} segmentIds *. In body (not allowed)
     * @apiParam {string[]} subSegmentIds *. In body (not allowed)
     * @apiParam {string} title *. In body
     * @apiParam {string} description . In body
     * @apiParam {string} thumbUrl * . In body
     * @apiParam {string} resourceType *. In body RESOURCE_TYPE_SAMPLE_PAPER, RESOURCE_TYPE_BOOK, RESOURCE_TYPE_OTHER
     * @apiParam {string} resourceUrl * . In body
     * @apiParam {string[]} tags . In body ['model-paper','IIT']
     * @apiParam {string} isActive . In Body 
     * @apiParam {string} isDeleted . In Body 
     */

    app.put('/api/admin/resources/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.id = req.params.id;
        b.userId = req.headers.userid;

        var findItem = function () {
            var d = Q.defer();
            Resource.find({
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
            // segments = (b.segmentIds && b.segmentIds.length > 0) ? b.segmentIds : i.segments;
            // subSegments = (b.subSegmentIds && b.subSegmentIds.length > 0) ? b.subSegmentIds : i.subSegments;
            title = b.title ? b.title : i.title;
            description = b.description ? b.description : i.description;
            thumbUrl = b.thumbUrl ? b.thumbUrl : i.thumbUrl;
            resourceType = b.resourceType ? b.resourceType : i.resourceType;
            resourceUrl = b.resourceUrl ? b.resourceUrl : i.resourceUrl;
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
            Resource.findByIdAndUpdate({
                _id: b.id
            }, {
                    $set: {
                        "title": title,
                        "description": description,
                        "thumbUrl": thumbUrl,
                        "resourceType": resourceType,
                        "resourceUrl": resourceUrl,
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
     * @api {get} /api/admin/resources/:id Get resources by id
     * @apiName Get resources by id
     * @apiDescription Get resources by id
     * @apiGroup resources
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is resource id )
     */

    app.get('/api/admin/resources/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        var findItemById = function (itemCount) {
            var d = Q.defer();
            Resource.find({
                _id: b.id
            },
                {
                    createdAt: 1,
                    timestamp: 1,
                    resourceUrl: 1,
                    thumbUrl: 1,
                    resourceType: 1,
                    subject: 1,
                    description: 1,
                    title: 1,
                    isActive: 1,
                    tags: 1,
                    duration: 1,
                    segments: 1,
                    subSegments: 1

                })
                .populate("subject segments subSegments", "name iconUrl")
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
       * @api {get} /api/subjects/:subjectId/resources Get all resources
       * @apiName Get Resources
       * @apiDescription Get all resources by subject
       * @apiGroup Mobile
       * @apiParam {string} userId . In Header
       * @apiParam {string} authToken . In Header
       * @apiParam {string} apiKey . In Header
       * @apiParam {string} version . In Header
       * @apiParam {string} pageNumber . In Query param pageNumber=1
       * @apiParam {string} pageSize . In Query param &pageSize=30
       * @apiParam {string} subjectId . In path 59f70721a60ca20004bd463e
       * @apiParam {string} resourceType . In query ?resourceType=RESOURCE_TYPE_SAMPLE_PAPER
       */
    app.get('/api/subjects/:subjectId/resources', function (req, res) {
        var out;
        var b = {};
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.subjectId = req.params.subjectId;
        b.resourceType = req.query.resourceType;
        if (!b.subjectId || b.subjectId == '') {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Subject id is required", b);
            res.json(out);
            return;
        }
        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var query = Resource.find(
            {
                isDeleted: false,
                isActive: true,
                subject: b.subjectId
            },
            {
                _id: 1,
                createdAt: 1,
                resourceUrl: 1,
                thumbUrl: 1,
                resourceType: 1,
                subject: 1,
                segments: 1,
                subSegments: 1,
                title: 1,
                description: 1,
                timestamp: 1,
                duration: 1
            }
        );

        if (b.resourceType && b.resourceType != '') {
            query.where("resourceType").equals(b.resourceType);
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
                .populate("subject segments subSegments", "name iconUrl")
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
}