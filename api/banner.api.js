var Q = require('q');
var request = require('request');
var C = require('./../constant');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var Banner = require('./../models/banner.model');

module.exports = function (app) {

    /**
     * @api {post} /api/admin/banners Save banner
     * @apiName Save banner
     * @apiDescription Save banner
     * @apiGroup Banner - Admin
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} bannerImageUrl . In body
     * @apiParam {string} caption . In body
     * @apiParam {string} entityType . In body
     * @apiParam {string} entityId . In body
     * @apiParam {number} order . In body . Order in which it should appear on list
     * @apiParam {string} bannerClickUrl . In body 
     */

    app.post('/api/admin/banners', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        var saveBanner = function () {
            var defer = Q.defer();
            var banner = new Banner();
            banner.bannerImageUrl = b.bannerImageUrl;
            banner.caption = b.caption;
            banner.entityType = b.entityType;
            banner.entityId = b.entityId;
            banner.bannerClickUrl = b.bannerClickUrl;
            banner.order = b.order;
            banner.timestamp = U.getTimeStamp();

            banner.save(function (err, data) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data._doc);
                    defer.resolve(out);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        saveBanner()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/admin/banners Get banner for admin
     * @apiName Get banner
     * @apiDescription Get banner
     * @apiGroup Admin - Banner
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header  
     */

    app.get('/api/admin/banners', function (req, res) {
        var out;
        var b = req.body;
        var getBanners = function () {
            var defer = Q.defer();
            Banner.find({
                isDeleted: false
            }, function (err, banners) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, banners);
                    defer.resolve(out);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getBanners()
            .then(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {put} /api/admin/banners/:id Update banner for admin
     * @apiName Update banner
     * @apiDescription Update banner
     * @apiGroup Admin - Banner
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In body    id is banner id
     * @apiParam {string} bannerImageUrl . In body  
     * @apiParam {string} caption . In body  
     * @apiParam {string} entityType . In body  
     * @apiParam {string} entityId . In body  
     * @apiParam {string} order . In body  
     * @apiParam {string} bannerClickUrl . In body  
     * @apiParam {string} isActive . In body  
     * @apiParam {string} isDeleted . In body 
     */

    app.put('/api/admin/banners/:id', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);
        b.id = req.params.id;
        var getBanners = function () {
            var defer = Q.defer();
            Banner.find({
                _id: b.id,
                isDeleted: false
            }, function (err, banners) {
                if (!err) {
                    if (banners && banners.length > 0) {
                        defer.resolve(banners);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No data found", b, err);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateBanner = function (banners) {
            var defer = Q.defer();
            bannerImageUrl = b.bannerImageUrl ? b.bannerImageUrl : banners[0].bannerImageUrl;
            caption = b.caption ? b.caption : banners[0].caption;
            entityType = b.entityType ? b.entityType : banners[0].entityType;
            entityId = b.entityId ? b.entityId : banners[0].entityId;
            order = b.order ? b.order : banners[0].order;
            bannerClickUrl = b.bannerClickUrl ? b.bannerClickUrl : banners[0].bannerClickUrl;
            let isActive = b.isActive != undefined ? b.isActive : banners[0].isActive;
            if (b.isDeleted == undefined) {
                isDeleted = banners[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    caption = U.getDeletedName(caption);
                    isActive = false;
                }
                isDeleted = b.isDeleted;
            }
            Banner.findByIdAndUpdate({
                _id: b.id
            }, {
                    $set: {
                        bannerImageUrl: bannerImageUrl,
                        caption: caption,
                        entityType: entityType,
                        entityId: entityId,
                        order: order,
                        bannerClickUrl: bannerClickUrl,
                        isActive: isActive,
                        isDeleted: isDeleted
                    }
                }
                , {
                    new: true, //   Returns updated data
                    lean: true  //    Returns json instead of mongoose model
                }
                , function (err, banner) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, banner);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getBanners()
            .then(function (banners) {
                return updateBanner(banners);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/banners Get banner for mobile
     * @apiName Get banner
     * @apiDescription Get banner
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header  
     */

    app.get('/api/banners', function (req, res) {
        var out;
        var getBanners = function () {
            var defer = Q.defer();
            Banner.find({
                isActive: true,
                isDeleted: false
            }).sort({
                order: 1
            }).exec(function (err, banners) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, banners);
                    defer.resolve(out);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getBanners()
            .then(function (out) {
                res.json(out);
            })
    })

    /**
    * @api {get} /api/admin/banners/:id Get banners by id
    * @apiName Get banners by id
    * @apiDescription Get banners by id
    * @apiGroup banners
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    * @apiParam {string} version . In Header
    * @apiParam {string} id . In param (id is banner id )
    */

    app.get('/api/admin/banners/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        var findItemById = function (itemCount) {
            var d = Q.defer();
            Banner.find({
                _id: b.id,
                isDeleted: false
            },
                {
                    isDeleted: false
                }).exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No data found", b)
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
}