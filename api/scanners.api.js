
var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var J = require('./../share/comman.methods');
var ObjectId = Mongoose.Types.ObjectId;
var Scanner = require('./../models/scanner.model');
var Topic = require('./../models/topics.model');
var Video = require('./../models/videos.model');
var Resource = require('./../models/resources.model');
var Test = require('./../models/tests.model');
var _ = require('underscore')._;
var QRCode = require('qrcode')

module.exports = function (app) {

    /**
     * @api {post} /api/admin/scanners Add new qr code
     * @apiName Add qr code
     * @apiDescription Add a new qr code
     * @apiGroup scanners
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} subjectId *. In body .objectId
     * @apiParam {string} title *. In body
     * @apiParam {string} description . In body
     * @apiParam {string} entityType *. In body ENTITY_TYPE_VIDEO, ENTITY_TYPE_SAMPLE_PAPER, ENTITY_TYPE_BOOK, ENTITY_TYPE_TEST, ENTITY_TYPE_PRACTICE
     * @apiParam {string} entityId *. In body
     * @apiParam {string[]} tags . In body ['newton','force']
     */

    app.post('/api/admin/scanners', function (req, res) {
        var out;
        var b;
        var subjectDetail = {};
        try {
            b = JSON.parse(req.body.body);
        } catch (e) {
            b = req.body;
        }
        // console.log("scanner add : " + JSON.stringify(b));
        b.userId = req.headers.userid;
        if (!b.subjectId || b.subjectId == "") {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Please provide subject detail', b);
            res.json(out);
            return;
        }
        if (!b.entityId || b.entityId == "") {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Please provide entityId', b);
            res.json(out);
            return;
        }
        if ((!b.entityType || b.entityType == "")) {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Please provide at entity Type', b);
            res.json(out);
            return;
        }
        b.scannerCode = U.generateScannerCode();
        // console.log("scanner code : " + b.scannerCode);

        var lookIfQrExist = function (entityId, entityType) {
            var d = Q.defer();
            var query = Scanner.findOne(
                {
                    isDeleted: false,
                    isActive: true,
                    entityId: entityId,
                    entityType: entityType
                },
                {
                    _id: 1,
                    createdAt: 1,
                    entityId: 1,
                    entityType: 1,
                    scannerCode: 1,
                    timestamp: 1,
                    title: 1,
                    description: 1
                }
            );
            query.find();
            query.lean();
            query.sort({
                createdAt: -1
            })
                .populate("subject")
                .exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            d.resolve(out);
                        } else {
                            out = U.getJson(C.STATUS_SUCCESS_CODE, "QR already exists", data);
                            d.reject(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        d.reject(out);
                    }
                })
            return d.promise;
        };

        var findItem = function () {
            var d = Q.defer();
            var query;
            if (b.entityType == "ENTITY_TYPE_VIDEO") {
                query = Video.find({ isDeleted: false });
            }
            else if (b.entityType == "ENTITY_TYPE_SAMPLE_PAPER") {
                query = Resource.find({ isDeleted: false });
                query.where("resourceType").equals("RESOURCE_TYPE_SAMPLE_PAPER");
            }
            else if (b.entityType == "ENTITY_TYPE_BOOK") {
                query = Resource.find({ isDeleted: false });
                query.where("resourceType").equals("RESOURCE_TYPE_BOOK");
            }
            else if (b.entityType == "ENTITY_TYPE_TEST") {
                query = Test.find({ isDeleted: false });
            }
            else if (b.entityType == "ENTITY_TYPE_PRACTICE") {
                query = Topic.find({ isDeleted: false });
            }
            if (query) {
                query.where("_id").equals(Mongoose.Types.ObjectId(b.entityId));

                query.exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems selected entity doesn't exist", b);
                            d.reject(out);
                        } else {
                            d.resolve(data);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        d.reject(out);
                    }
                })
            } else {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Please provide correct entity type', b);
                d.reject(out);
            }
            return d.promise;
        };

        var addItem = function () {
            var d = Q.defer();
            var item = new Scanner();
            item.title = b.title;
            item.description = b.description;
            item.subject = b.subjectId;
            if (b.entityType == "ENTITY_TYPE_PRACTICE")
                item.topic = b.entityId;
            else if (b.entityType == "ENTITY_TYPE_VIDEO")
                item.video = b.entityId;
            else if (b.entityType == "ENTITY_TYPE_SAMPLE_PAPER" || b.entityType == "ENTITY_TYPE_BOOK")
                item.resource = b.entityId;
            else if (b.entityType == "ENTITY_TYPE_TEST")
                item.test = b.entityId;
            else {
                d.reject(U.getJson(C.STATUS_ERR_KNOWN_CODE, "Entity type is not correct", b))
                return;
            };
            item.entityId = b.entityId;
            item.entityIdPlain = b.entityId;
            item.entityType = b.entityType;
            item.scannerCode = b.scannerCode;
            item.timestamp = U.getTimeStamp();
            item.createdById = b.userId;
            item.updatedById = b.userId;
            item.tags = b.tags;

            item.save(function (err, data) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data._doc);
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
        lookIfQrExist(b.entityId, b.entityType)
            .then(function (out) {
                return findItem();
            })
            .then(function (subjects) {
                subjectDetail = subjects[0];
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
       * @api {get} /api/admin/scanners Get all scanners (Admin)
       * @apiName Get Scanners
       * @apiDescription Get all scanners || Filter by fields for admin
       * @apiGroup Scanners
       * @apiParam {string} userId . In Header
       * @apiParam {string} authToken . In Header
       * @apiParam {string} apiKey . In Header
       * @apiParam {string} version . In Header
       * @apiParam {string} pageNumber . In Query param pageNumber=1
       * @apiParam {string} pageSize . In Query param &pageSize=30
       * @apiParam {string} subjectId . In Query param subjectId=59f70721a60ca20004bd463e
       * @apiParam {string} entityType . In Query param  ENTITY_TYPE_VIDEO, ENTITY_TYPE_SAMPLE_PAPER, ENTITY_TYPE_BOOK, ENTITY_TYPE_TEST, ENTITY_TYPE_PRACTICE
       * @apiParam {string} scannerCode . In Query param - For search
       * @apiParam {string} title . In Query param - For search
       */
    app.get('/api/admin/scanners', function (req, res) {
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
        var query = Scanner.find(
            {
                isDeleted: false
            },
            {
                _id: 1,
                createdAt: 1,
                video: 1,
                topic: 1,
                resource: 1,
                test: 1,
                entityType: 1,
                title: 1,
                timestamp: 1,
                isActive: 1
            }
        );
        if (b.keyword != '')
            query = Scanner.find({
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
                .populate("subjects", "name iconUrl")
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
     * @api {put} /api/admin/scanners/:id Update scanners (Admin)
     * @apiName Update scanners
     * @apiDescription Update scanners
     * @apiGroup scanners
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

    app.put('/api/admin/scanners/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.id = req.params.id;
        b.userId = req.headers.userid;

        var findItem = function () {
            var d = Q.defer();
            Scanner.find({
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
            Scanner.findByIdAndUpdate({
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
     * @api {get} /api/admin/scanners/:id Get scanners by id
     * @apiName Get scanners by id
     * @apiDescription Get scanners by id
     * @apiGroup scanners
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In param (id is scanner id )
     */

    app.get('/api/admin/scanners/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        var findItemById = function (itemCount) {
            var d = Q.defer();
            Scanner.find({
                _id: b.id
            },
                {
                    isDeleted: 0

                })
                .populate("subject", "name iconUrl")
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
       * @api {get} /api/scanners/:id
       * @apiName  Get entity Detail
       * @apiDescription Get entity detail by id received on qr scanning
       * @apiGroup Mobile
       * @apiParam {string} userId . In Header
       * @apiParam {string} authToken . In Header
       * @apiParam {string} apiKey . In Header
       * @apiParam {string} version . In Header
       * @apiParam {string} code . In path 6675FFKTY4UZDR5A
       */
    app.get('/api/scanners/:code', function (req, res) {
        var out;
        var b = {};
        var scannerData = {};
        var userDetail = {};
        b.scannerCode = req.params.code;
        b.userId = req.headers.userid;
        if (!b.scannerCode || b.scannerCode == '') {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "scannerCode is required", b);
            res.json(out);
            return;
        }

        var scanCode = function (scannerCode) {
            var d = Q.defer();
            var query = Scanner.find(
                {
                    isDeleted: false,
                    isActive: true,
                    scannerCode: scannerCode
                },
                {
                    _id: 1,
                    createdAt: 1,
                    entityId: 1,
                    entityType: 1,
                    timestamp: 1,
                    title: 1,
                    description: 1
                }
            );
            query.find();
            query.lean();
            query.sort({
                createdAt: -1
            })
                .populate("subject")
                .exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            d.reject(out);
                        } else {
                            d.resolve(data[0]);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        d.reject(out);
                    }
                })
            return d.promise;
        };
        var getItemDetail = function (entityType, entityId) {
            var d = Q.defer();
            var query;
            if (entityType == 'ENTITY_TYPE_VIDEO') {
                query = Video.find(
                    {
                        isDeleted: false,
                        isActive: true,
                        _id: entityId
                    },
                    {
                        durationToDisplay: 1,
                        timestamp: 1,
                        thumbUrl: 1,
                        videoUrl: 1,
                        videoType: 1,
                        subject: 1,
                        description: 1,
                        title: 1,
                        duration: 1,
                    }
                );
            }
            else if (entityType == 'ENTITY_TYPE_SAMPLE_PAPER' || entityType == 'ENTITY_TYPE_BOOK') {
                query = Resource.find(
                    {
                        isDeleted: false,
                        isActive: true,
                        _id: entityId
                    },
                    {
                        _id: 1,
                        timestamp: 1,
                        resourceUrl: 1,
                        thumbUrl: 1,
                        resourceType: 1,
                        subject: 1,
                        description: 1,
                        title: 1,

                    }
                );
            } else if (entityType == 'ENTITY_TYPE_TEST') {
                query = Test.find(
                    {
                        isDeleted: false,
                        isActive: true,
                        _id: entityId
                    },
                    {
                        _id: 1,
                        duration: 1,
                        subject: 1,
                        passingCutOff: 1,
                        instructions: 1,
                        endDate: 1,
                        startDate: 1,
                        testName: 1,
                        timestamp: 1,
                        segments: 1,
                        subSegments: 1
                    }
                );
            } else if (entityType == 'ENTITY_TYPE_PRACTICE') {
                query = Topic.find(
                    {
                        isDeleted: false,
                        isActive: true,
                        _id: entityId
                    },
                    {
                        _id: 1,
                        name: 1,
                        timestamp: 1,
                        subjects: 1,
                        units: 1,
                        chapters: 1,
                        segments: 1,
                        subSegments: 1
                    }
                );
            }
            if (query) {
                query.lean();
                query.sort({
                    createdAt: -1
                })
                    .populate("subject subjects units chapters", "name iconUrl")
                    .exec(function (err, data) {
                        if (!err) {
                            if (data == null || data.length == 0) {
                                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Seems this item doesn't exist anymore", b);
                                d.reject(out);
                            } else {
                                d.resolve(data[0]);
                            }
                        } else {
                            out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                            d.reject(out);
                        }
                    })
            } else {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Entity type for this scanning detail is not valid", scannerData);
                d.reject(out);
            }
            return d.promise;
        };
        J.verifyUser(b.userId)
            .then(function (user) {
                userDetail = user;
                return scanCode(b.scannerCode);
            })
            .then(function (data) {
                scannerData = data;
                return getItemDetail(data.entityType, data.entityId);
            })
            .then(function (entityDetail) {
                var out = {};
                if (entityDetail.segments && entityDetail.subSegments) {
                    var isSegmentEligible = false;
                    var isSubSegmentEligible = false;
                    for (var i = 0; i < entityDetail.segments.length; i++) {
                        if (userDetail.segment.equals(entityDetail.segments[i])) {
                            isSegmentEligible = true;
                            break;
                        }
                    }
                    for (var i = 0; i < entityDetail.subSegments.length; i++) {
                        if (userDetail.subSegment.equals(entityDetail.subSegments[i])) {
                            isSubSegmentEligible = true;
                            break;
                        }
                    }
                    if (isSegmentEligible && isSubSegmentEligible) {
                        scannerData.entityDetail = entityDetail;
                        out.status = C.STATUS_SUCCESS_CODE;
                        out.message = C.STATUS_SUCCESS;
                    } else {
                        // scannerData.entityDetail = entityDetail;
                        out.status = C.STATUS_ERR_KNOWN_CODE;
                        out.message = "This item is not intended for your class";
                    }
                } else {
                    scannerData.entityDetail = entityDetail;
                    out.status = C.STATUS_SUCCESS_CODE;
                    out.message = C.STATUS_SUCCESS;
                }
                out.data = scannerData;
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    app.get('/api/admin/qr', function (req, res) {
        var out;
        // res.end(new Buffer(qr.toDataURL(), 'base64'));
        QRCode.toDataURL('I am a pony!', function (err, url) {
            console.log(url);
            // res.json(url);
        })
        QRCode.toFile('filename.png', 'Some text', {
            // color: {
            //     dark: '#00F',  // Blue dots
            //     light: '#0000' // Transparent background
            // }
        }, function (err) {
            if (err) throw err
            console.log('done')
        })
    });
}