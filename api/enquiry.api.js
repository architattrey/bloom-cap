var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var Enquiry = require('./../models/enquiry.model');

module.exports = function (app) {

    /**
     * @api {post} /api/enquiries Add new enquiry
     * @apiName Add enquiry
     * @apiDescription Add a new enquiry
     * @apiGroup enquiries
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name *. In body
     * @apiParam {string} email * . In body
     * @apiParam {string} mobile * . In body
     * @apiParam {string} message * . In body
     */

    app.post('/api/enquiries', function (req, res) {
        var out;
        var b = JSON.parse(req.body.body);

        var addItem = function () {
            var d = Q.defer();
            var item = new Enquiry();
            item.name = b.name;
            item.email = b.email;
            item.message = b.message;
            item.mobile=b.mobile;
            item.timestamp = U.getTimeStamp();

            item.save(function (err, data) {
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
        addItem()
            .then(function (out) {
                //  TODO send enquiry mail
                // U.sendRegistrationMail(b.name, b.email, b.message);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
          * @api {get} /api/admin/enquiries Get All Enquiry
          * @apiName Get enquiries
          * @apiDescription Get All enquiries || Search an enquiries || filter by date or isActive 
          * @apiGroup enquiries
          * @apiParam {string} apiKey . In Header
          * @apiParam {string} version . In Header
          * @apiParam {string} pageNumber . In Query Param
          * @apiParam {string} pageSize . In Query Param
         S * @apiParam {string} isActive . In Query param
        */

    app.get('/api/admin/enquiries', function (req, res) {
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
        var getItemCount = function () {
            var d = Q.defer();
            var query = Enquiry.find({
                isDeleted: false
            });
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.fromDate != '')
                query = query.where('createdAt').gte(b.fromDate).lte(b.toDate);

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
            var query = Enquiry.find({
                isDeleted: false
            },
                {
                    isDeleted: 0
                });
            if (b.keyword != '')
                query = Enquiry.find({
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

            query.sort({
                createdAt: -1
            })
                .skip(pageOptions.limit * (pageOptions.page - 1))
                .limit(pageOptions.limit)
                .exec(function (err, data) {
                    if (!err) {
                        if (data == null || data.length == 0) {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "No data found", b);
                            d.reject(out);
                        } else {

                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, data, err, U.getPaginationObject(itemCount, b.pageSize, b.pageNumber));
                            d.resolve(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
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