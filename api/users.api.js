var U = require('./../share/util.api');
var C = require('./../constant');
var Mongoose = require('mongoose');
var User = require('./../models/users.model');
var Student = require('./../models/student1.model');
var request = require('request');
var Q = require('q');
module.exports = function (app) {

    /**
     * @api {post} /api/users Register new user
     * @apiName New user registration
     * @apiDescription New user registration
     * @apiDeprecated
     * @apiGroup Users
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} fullName . In body
     * @apiParam {string} mobile . In body  . Required field
     * @apiParam {string} email . In body 
     * @apiParam {string} password . In body 
     * @apiParam {string} city .In body 
     * @apiParam {string} pinCode . In body
     * @apiParam {string} segmentId . In body
     * @apiParam {string} subSegmentId . In body
     * @apiParam {string} schoolName . In body
     * @apiParam {string} deviceType . In body
     * @apiParam {string} imeiNo . In body
     * @apiParam {string} pushId . In body 
     * @apiParam {string} socialToken . In body 
     * @apiParam {string} loginMethod . In body  like -: facebook||google||mannual
     * @apiParam {string} profileImgUrl . In body  
     * @apiParamExample {json} Request-Example:
     * {
     *  "fullName": "Manish",
     *  "mobile": "9910669834",
     *  "email": "manish@irinnovative.com",
     *  "city": "Delhi",
     *  "pinCode": 2001002,
     *  "segmentId": "59b0ee7af239562bc086f0b8",
     *  "subSegmentId": "59b0ee7af239562bc086f0b8",
     *  "schoolName": "Jain babu",
     *  "deviceType": "Android",
     *  "pushId": "sdsdsdsd",
     *  "password": "qwerty",
     *  "imeiNo": "877364769826387665"
     *  "socialToken": "877364769826387665"
     *  "loginMethod": facebook
     *  "profileImgUrl": "ksudjaheguygskjshd"
     *  }
     */

    app.post('/api/users', function (req, res) {
        var out;
        var b = req.body;
        b.userId = req.headers.userid;
        var userArr = [];
        var addUser = function () {
            var defer = Q.defer();
            var user = new User();
            var notifyDetails = {};
            notifyDetails.pushId = b.pushId;
            if (b.loginMethod == 'facebook') {
                user.deviceDetails.facebookSocialToken = b.socialToken;
            }
            if (b.loginMethod == 'google') {
                user.deviceDetails.googleSocialToken = b.socialToken;
            }
            notifyDetails.imeiNo = b.imeiNo;
            notifyDetails.deviceType = b.deviceType;
            user.fullName = b.fullName;
            user.profileImgUrl = b.profileImgUrl;
            user.mobile = b.mobile;
            user.email = b.email;
            user.password = b.password;
            user.city = b.city;
            user.pinCode = b.pinCode;
            user.segment = b.segmentId;
            user.subSegment = b.subSegmentId;
            user.schoolName = b.schoolName;
            user.deviceDetails = notifyDetails;
            user.createdBy = b.createdBy;
            user.timestamp = U.getTimeStamp();
            user.save(function (err, data) {
                if (!err) {
                    var user = {};
                    user._id = data._id;
                    user.schoolName = data.schoolName;
                    user.subSegment = data.subSegment;
                    user.segment = data.segment;
                    user.pinCode = data.pinCode;
                    user.city = data.city;
                    user.email = data.email;
                    user.mobile = data.mobile;
                    user.fullName = data.fullName;
                    user.timestamp = data.timestamp;
                    user.createdAt = data.createdAt;
                    user.updatedAt = data.updatedAt;
                    userArr.push(user);
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, userArr);
                    defer.resolve(out);
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Mobile number already exist', b);
                        defer.reject(out);
                    } else if (err.errors.mobile) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, err.errors.mobile.message, b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var updateProfile = function () {
            var defer = Q.defer();
            User.find({
                _id: b.userId
            }, function (err, user) {
                if (!err) {
                    if (user == null || user.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'User not found', b);
                        defer.reject(out);
                    } else {
                        //console.log("user result", user);
                        var objectToUpdate = {};
                        if (b.fullName == undefined) {
                            fullName = user[0].fullName;
                        } else {
                            fullName = b.fullName;
                        }
                        if (b.profileImgUrl == undefined) {
                            profileImgUrl = user[0].profileImgUrl;
                        } else {
                            profileImgUrl = b.profileImgUrl;
                        }
                        if (b.isSchool == undefined) {
                            isSchool = user[0].isSchool;
                        } else {
                            isSchool = b.isSchool;
                        }
                        if (b.segmentId == undefined) {
                            segment = user[0].segment;
                        } else {
                            segment = b.segmentId;
                        }
                        if (b.subSegmentId == undefined) {
                            subSegment = user[0].subSegment;
                        } else {
                            subSegment = b.subSegmentId;
                        }
                        if (b.pushId == undefined) {
                            pushId = user[0].pushId;
                        } else {
                            pushId = b.pushId;
                        }
                        if (b.imeiNo == undefined) {
                            imeiNo = user[0].imeiNo;
                        } else {
                            imeiNo = b.imeiNo;
                        }
                        if (b.deviceType == undefined) {
                            deviceType = user[0].deviceType;
                        } else {
                            deviceType = b.deviceType;
                        }
                        if (b.loginMethod == 'facebook') {
                            socialToken = b.socialToken;
                        }
                        if (b.loginMethod == 'google') {
                            socialToken = b.socialToken;
                        }
                        User.update({
                            _id: b.userId
                        }, {
                                $set: {
                                    "fullName": fullName,
                                    "isSchool": isSchool,
                                    "segment": segment,
                                    "subSegment": subSegment,
                                    "profileImgUrl": profileImgUrl,
                                    "deviceDetails.pushId": b.pushId,
                                    "deviceDetails.imeiNo": b.imeiNo,
                                    "deviceDetails.deviceType": b.deviceType,
                                    "deviceDetails.facebookSocialToken": b.socialToken,
                                    "deviceDetails.googleSocialToken": b.socialToken
                                }
                            }, {
                                upsert: true
                            }, function (err, user) {
                                if (!err) {
                                    User.find({
                                        _id: b.userId
                                    }, {
                                            _id: 1,
                                            schoolName: 1,
                                            subSegment: 1,
                                            segment: 1,
                                            pinCode: 1,
                                            city: 1,
                                            email: 1,
                                            mobile: 1,
                                            fullName: 1,
                                            timestamp: 1,
                                            createdAt: 1,
                                            updatedAt: 1
                                        }, function (err, updatedUser) {
                                            if (!err) {
                                                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, updatedUser);
                                                defer.resolve(out);
                                            } else {
                                                out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                                                defer.reject(out);
                                            }
                                        })
                                } else {
                                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                                    defer.reject(out);
                                }
                            })
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        if (b.userId == '' || b.userId == undefined) {
            addUser()
                .then(function (out) {
                    res.json(out);
                })
                .fail(function (out) {
                    res.json(out);
                })
        } else {
            updateProfile()
                .then(function () {
                    res.json(out);
                })
                .fail(function (out) {
                    res.json(out);
                })
        }
    });

    /**
     * @api {get} /api/users Get all users with filters
     * @apiName Get users
     * @apiDescription All users
     * @apiGroup Users
     * @apiParam {string} userId . In Header
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} pageNumber . In Query Param
     * @apiParam {string} pageSize . In Query Param
     * @apiParam {string} segment . In Query param like (2017-08-22T07:50:13.814Z)
     * @apiParam {string} subSegment . In Query param like (2017-08-22T07:50:13.814Z)
     * @apiParam {string} isMobileVerified . In Query param. Name
     * @apiParam {string} fromDate . In Query param like (2017-08-22T07:50:13.814Z)
     * @apiParam {string} toDate . In Query param like (2017-08-22T07:50:13.814Z)
     * @apiParam {string} isActive . In Query param. (0||1)
     * @apiParam {string} createdAt . In Query Param
     * @apiParam {string} mobileNo . In Query Param
     * @apiParam {string} emailId . In Query Param
     * @apiParam {string} name . In Query Param
     */

    app.get('/api/users', function (req, res) {
        var out;
        var b = {};
        b = req.query;
        console.log("Data from Query", b);
        var pageOptions = {
            page: parseInt(b.pageNumber) || 1,
            limit: parseInt(b.pageSize) || C.PAGINATION_DEFAULT_PAGE_SIZE
        }

        var getUserCount = function () {
            var defer = Q.defer();
            var query = User.find({});
            if (b.segment != '')
                query = query.where('segment').equals(b.segment)
            if (b.subSegment != '')
                query = query.where('subSegment').equals(b.subSegment)
            if (b.isMobileVerified != '')
                query = query.where('isMobileVerified').equals(b.isMobileVerified)
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.createdAt != '')
                query = query.sort({
                    createdAt: b.createdAt
                })
            if (b.fromDate != '')
                query = query.where('createdAt').gte(b.fromDate).lte(b.toDate);

            query.count().exec(function (err, userCount) {
                if (!err) {
                    b.userCount = userCount;
                    defer.resolve(userCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getUsers = function (userCount) {
            var defer = Q.defer();
            var query = User.find({});
            if (b.segment != '')
                query = query.where('segment').equals(b.segment)
            if (b.subSegment != '')
                query = query.where('subSegment').equals(b.subSegment)
            if (b.isMobileVerified != '')
                query = query.where('isMobileVerified').equals(b.isMobileVerified)
            if (b.isActive != '')
                query = query.where('isActive').equals(b.isActive)
            if (b.createdAt != '')
                query = query.sort({
                    createdAt: b.createdAt
                })
            if (b.fromDate != '')
                query = query.where('createdAt').gte(b.fromDate).lte(b.toDate);
            if (b.mobileNo != '')
                query = Chapter.find({
                    "mobileNo": {
                        "$regex": b.mobileNo,
                        '$options': 'i'
                    }
                })
            if (b.emailId != '')
                query = Chapter.find({
                    "emailId": {
                        "$regex": b.emailId,
                        '$options': 'i'
                    }
                })
            if (b.name != '')
                query = Chapter.find({
                    "name": {
                        "$regex": b.name,
                        '$options': 'i'
                    }
                })

            query.sort({
                createdAt: -1
            }).skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, users) {
                if (!err) {
                    if (users == null || users.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No User found')
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, users, err, U.getPaginationObject(userCount, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getUserCount()
            .then(function (userCount) {
                return getUsers(userCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
     * @api {delete} /api/users/:id Delete an user 
     * @apiName Delete User
     * @apiDescription Delete an user 
     * @apiGroup Users
     * @apiParam {string} userId . In Header -deleted by userid
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In Params - Id of that userId you want to delete
     */

    app.delete('/api/users/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        b.userId = req.headers.userid;
        var deleteUser = function () {
            var defer = Q.defer();
            User.update({
                _id: b.id
            }, {
                    $set: {
                        isDeleted: 1
                    }
                }, function (err, data) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        deleteUser()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
     * @api {get} /api/users/:id/profile View user profile
     * @apiName View User
     * @apiDescription View user profile
     * @apiGroup Mobile
     * @apiParam {string} userId . In Header 
     * @apiParam {string} authToken . In Header
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} id . In Params - Id of that userId you want to view
     * @apiSuccessExample {json} Success-Response:
     * {
     *   "status": C.STATUS_SUCCESS_CODE,
     *   "message": "success",
     *   "data": [
     *   {
     *       "_id": "5a1534a01bd9ab19dc3d97d8",
     *       "createdAt": "2017-11-22T08:26:08.704Z",
     *       "updatedAt": "2017-11-22T08:26:08.704Z",
     *       "studentMobileNo": "9927632372",
     *       "guardianMobileNo": "9910669836",
     *       "motherMobileNo": "0987654323",
     *       "state": "U.P",
     *       "city": "Ghaziabad",
     *       "school": {
     *           "_id": "5a141fd193b0593e1fe107d3",
     *           "name": "School1"
     *       },
     *       "subSegment": {
     *           "_id": "59fefe6b37ae9900043a32df",
     *           "name": "XII"
     *       },
     *       "segment": {
     *           "_id": "59f706b2a60ca20004bd463a",
     *           "name": "CBSE"
     *       },
     *       "email": "manish@gmail.com",
     *       "guardianName": "TEST",
     *       "fatherName": "TEST",
     *       "motherName": "TEST",
     *       "gender": "1",
     *       "dob": "05/08/1970",
     *       "name": "MANISH",
     *      "proileImage": ""
     *   }
     *   ],
     *   "paginate": {},
     *   "error": {}
     *   }
     */

    app.get('/api/users/:id/profile', function (req, res) {
        var out;
        var b = req.params;
        b.userId = req.headers.userid;
        var getUserProfile = function () {
            var defer = Q.defer();
            Student.aggregate([{
                $match: { "_id": Mongoose.Types.ObjectId(b.id) }
            },
            {
                $lookup: {
                    from: "schools",
                    localField: "school",
                    foreignField: "schoolId",
                    as: "school"
                }
            },
            {
                $lookup: {
                    from: "segments",
                    localField: "segment",
                    foreignField: "_id",
                    as: "segment"
                }
            },
            {
                $lookup: {
                    from: "subsegments",
                    localField: "subSegment",
                    foreignField: "_id",
                    as: "subSegment"
                }
            },
            {
                $project: {
                    "_id": 1,
                    "studentMobileNo": 1,
                    "subSegment._id": 1,
                    "subSegment.name": 1,
                    "segment._id": 1,
                    "segment.name": 1,
                    "email": 1,
                    "name": 1,
                    "pinCode": 1,
                    "address": 1,
                    "profileImage": 1,
                    "school._id": 1,
                    "school.name": 1,
                    "gender": 1,
                    "dob": 1,
                    "section": 1,
                    "fatherMobileNo": 1,
                    "motherMobileNo": 1,
                    "guardianMobileNo": 1,
                    "fatherName": 1,
                    "motherName": 1,
                    "guardianName": 1,
                    "state": 1,
                    "city": 1
                }
            },
            ])
                .exec(function (err, user) {
                    if (!err) {
                        if (user != null || user.length > 0) {
                            out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
                            defer.resolve(out);
                        } else {
                            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                            defer.reject(out);
                        }
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        getUserProfile()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })


}