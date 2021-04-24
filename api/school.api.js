

var Q = require('q');
var Joi = require('joi');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var ObjectId = Mongoose.Types.ObjectId;
var ExpressJoi = require('express-joi-validator');
var School = require('./../models/school.model');
//var States = require('./../public');
module.exports = function (app) {

    /**
     * @api {post} /api/admin/schools Add new school
     * @apiName Add School
     * @apiDescription Add a new school
     * @apiGroup Schools
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} name . In body
     * @apiParam {string} city . In body
     * @apiParam {string} state . In body
     * @apiParam {string} iconUrl . In body
     * @apiParam {string} bannerUrl . In body
     */

    app.post('/api/admin/schools', function (req, res) {
        var out;
        var b = req.body;
        if (b.body) {
            console.log("Addition from admin panel. Need to parse");
            b = JSON.parse(b.body);
        } else {
            console.log("Addition from mobile app. Nothing to do");
        }
        // console.log(b);
        b.userId = req.headers.userid;

        var findSchool = function (state, city, schoolName) {
            var defer = Q.defer();
            var query = School.find({
                isDeleted: false
            });
            query.where('state').equals(state);
            query.where('city').equals(city);
            query.where('name').equals(schoolName);

            query.exec(function (err, data) {
                if (!err) {
                    if (data && data.length > 0) {
                        //  We have found the school
                        var school = data[0];
                        defer.resolve(school);
                    } else {
                        addSchool(b.schoolName, b.state, b.city)
                            .then(function (newSchool) {
                                defer.resolve(newSchool);
                            })
                            .fail(function (err) {
                                defer.reject(err);
                            })
                    }

                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };

        var addSchool = function () {
            var defer = Q.defer();
            var school = new School();
            school.name = b.name;
            school.nameInternal = b.name;
            school.city = b.city;
            school.state = b.state;
            school.iconUrl = b.iconUrl;
            school.bannerUrl = b.bannerUrl;
            // TO DO add created by id
            school.createdById = b.userId;
            school.timestamp = U.getTimeStamp();

            school.save(function (err, data) {
                if (!err) {
                    console.log("school id after insert : " + data._id);
                    School.update({ _id: data._id }, { $set: { schoolId: data._id } }, { upsert: true },
                        function (updateError, updatedData) {
                            if (updateError) {
                                console.log("error while saving school. Removing last inserted one");
                                School.find({ id: data._id }).remove().exec();
                                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Failed to create school", data, updateError);
                                defer.reject(out);
                            } else {
                                defer.resolve(data);
                            }
                        })

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
        findSchool(b.state, b.city, b.name)
            .then(function (school) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, school._id, school._doc);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {get} /api/admin/schools get schools with search and city,state wise
     * @apiName Get School
     * @apiDescription Get school
     * @apiGroup Schools
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} keyword . In query param
     * @apiParam {string} city . In query param
     * @apiParam {string} state . In query param     
     */

    app.get('/api/admin/schools', function (req, res) {
        var out;
        var b = {};
        b.isActive = req.query.isActive == undefined ? '' : req.query.isActive;
        b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
        b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
        b.name = req.query.keyword == undefined ? '' : req.query.keyword;
        b.city = req.query.city == undefined ? '' : req.query.city;
        b.state = req.query.state == undefined ? '' : req.query.state;

        var pageOptions = {
            page: parseInt(b.pageNumber),
            limit: parseInt(b.pageSize)
        }
        var query = School.find({
            isDeleted: false
        });
        if (b.isActive != '')
            query = query.where('isActive').equals(b.isActive)
        if (b.city != '')
            query = query.where('city').equals(b.city)
        if (b.state != '')
            query = query.where('state').equals(b.state)
        var getSchoolCount = function () {
            var defer = Q.defer();
            query.count().exec(function (err, schoolCount) {
                if (!err) {
                    b.schoolCount = schoolCount;
                    defer.resolve();
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getAllSchool = function () {
            var defer = Q.defer();
            query.find();
            query.sort({
                createdAt: -1
            })
                .skip(pageOptions.limit * (pageOptions.page - 1))
                .limit(pageOptions.limit)
                .exec(function (err, school) {
                    if (!err) {
                        defer.resolve(school);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getSchoolCount()
            .then(function () {
                return getAllSchool()
            })
            .then(function (school) {
                var pagination = U.getPaginationObject(b.schoolCount, b.pageSize, b.pageNumber);
                if (school == null || school.length == 0) {
                    out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, "", "", pagination);
                } else {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, school, "", pagination);
                }
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/states/:state/cities/:city/schools?keyword get All schools by state and city
     * @apiName get All schools by state and city
     * @apiDescription get All schools by state and city
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} city *. In path
     * @apiParam {string} state *. In path
     * @apiParam {string} keyword . In query
     */

    app.get('/api/states/:stateName/cities/:cityName/schools', function (req, res) {
        var out;
        var b = req.params;
        b.keyword = req.query.keyword;
        var getAllSchool = function () {
            var defer = Q.defer();
            var query;
            if (b.keyword && b.keyword != '') {
                query = School.find({
                    isDeleted: false,
                    isActive: true,
                    state: b.stateName,
                    city: b.cityName,
                    "name": {
                        "$regex": b.keyword,
                        '$options': 'i'
                    },
                });
            } else {
                query = School.find({
                    isDeleted: false,
                    isActive: true,
                    state: b.stateName,
                    city: b.cityName,
                });
            }

            query.select("name state city");
            query.exec(function (err, school) {
                if (!err) {
                    if (school == null || school.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.reject(out);
                    } else {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, school, err);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getAllSchool()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


    /**
     * @api {put} /api/admin/schools/:id Update school for admin
     * @apiName Update school
     * @apiDescription Update school
     * @apiGroup Admin - School
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In body    id is school id
     * @apiParam {string} name . In body
     * @apiParam {string} city . In body
     * @apiParam {string} state . In body
     * @apiParam {string} iconUrl . In body
     * @apiParam {string} bannerUrl . In body 
     * @apiParam {string} isActive . In body  
     * @apiParam {string} isDeleted . In body 
     */

    app.put('/api/admin/schools/:id', function (req, res) {
        var out;
        var b;
        try {
            b = JSON.parse(req.body.body);
        } catch (e) {
            b = req.body;
        }
        b.id = req.params.id;
        var findItem = function () {
            var defer = Q.defer();
            School.find({
                _id: b.id,
                isDeleted: false
            }, function (err, schools) {
                if (!err) {
                    if (schools && schools.length > 0) {
                        defer.resolve(schools);
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
        var updateItem = function (schools) {
            var defer = Q.defer();
            name = b.name ? b.name : schools[0].name;
            city = b.city ? b.city : schools[0].city;
            state = b.state ? b.state : schools[0].state;
            iconUrl = b.iconUrl ? b.iconUrl : schools[0].iconUrl;
            bannerUrl = b.bannerUrl ? b.bannerUrl : schools[0].bannerUrl;
            isActive = b.isActive != undefined ? b.isActive : schools[0].isActive;
            if (b.isDeleted == undefined) {
                isDeleted = schools[0].isDeleted;
            } else {
                if (b.isDeleted) {
                    isActive = false;
                    name = U.getDeletedName(name);
                }
                isDeleted = b.isDeleted;
            }
            School.findByIdAndUpdate({
                _id: b.id
            }, {
                    $set: {
                        name: name,
                        nameInternal: name,
                        city: city,
                        state: state,
                        iconUrl: iconUrl,
                        bannerUrl: bannerUrl,
                        isActive: isActive,
                        isDeleted: isDeleted
                    }
                }, {
                    new: true, //   Returns updated data
                    lean: true,  //    Returns json instead of mongoose model
                    runSettersOnQuery: true
                }, function (err, school) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, school);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        findItem()
            .then(function (schools) {
                return updateItem(schools);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
    * @api {get} /api/admin/schools/:id Get schools by id
    * @apiName Get schools by id
    * @apiDescription Get schools by id
    * @apiGroup schools
    * @apiParam {string} userId . In Header
    * @apiParam {string} authToken . In Header
    * @apiParam {string} apiKey . In Header
    * @apiParam {string} version . In Header
    * @apiParam {string} id . In param (id is school id )
    */

    app.get('/api/admin/schools/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        var findItemById = function (itemCount) {
            var d = Q.defer();
            School.find({
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