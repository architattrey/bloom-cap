var U = require('./../share/util.api');
var C = require('./../constant');
var Staff = require('./../models/staffManagement.model');
var LoginHistory = require('./../models/loginHistory.model');
var request = require('request');
var Q = require('q');
module.exports = function (app) {

    /**
          * @api {post} /api/staff Register new staff
          * @apiName New staff registration
          * @apiDescription New staff registration
          * @apiGroup Staff
          * @apiParam {string} userId . In Header
          * @apiParam {string} authToken . In Header
          * @apiParam {string} apiKey . In Header
          * @apiParam {string} version . In Header
          * @apiParam {string} fullName . In body
          * @apiParam {string} mobile . In body  
          * @apiParam {string} email . In body 
          * @apiParam {string} designation .In body 
          * @apiParam {string} password . In body
          * @apiParam {string} staffId . In body
          * @apiParam {string} roles . In body
         */

    app.post('/api/staff', function (req, res) {
        var out;
        var b = req.body;
        b.roles = JSON.parse(req.body.roles);
        b.userId = req.headers.userid;
        console.log("data from body", b);
        var addNewStaff = function () {
            var defer = Q.defer();
            var staff = new Staff();
            staff.fullName = b.fullName;
            staff.mobile = b.mobile;
            staff.email = b.email;
            staff.designation = b.designation;
            staff.password = U.getRandomPassword();
            staff.staffId = U.generateRandomStaffId().toUpperCase();
            staff.roles = b.roles;
            staff.timestamp = U.getTimeStamp();

            staff.save(function (err, data) {
                if (!err) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, b);
                    defer.resolve(out);
                } else {
                    if (err.code == 11000) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Email already exist', b);
                        defer.reject(out);
                    }
                    else if (err.errors.email) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, err.errors.email.message, b);
                        defer.reject(out);
                    }
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        addNewStaff()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
          * @api {get} /api/staff Get all staff with filters
          * @apiName Get staff
          * @apiDescription All staff
          * @apiGroup Staff
          * @apiParam {string} userId . In Header
          * @apiParam {string} authToken . In Header
          * @apiParam {string} apiKey . In Header
          * @apiParam {string} version . In Header
          * @apiParam {string} pageNumber . In Query Param
          * @apiParam {string} pageSize . In Query Param
          * @apiParam {string} name . In Query param 
          * @apiParam {string} staffId . In Query param 
          * @apiParam {string} email . In Query param. Name
          * @apiParam {string} mobile . In Query param 
          * @apiParam {string} role . In Query param 
          * @apiParam {string} fromTime . In Query param.
          * @apiParam {string} toTime . In Query param.
          * @apiParam {string} block . In Query Param . (0||1)
         */

    app.get('/api/staff', function (req, res) {
        var out;
        var b = {};
        b = req.query;

        var pageOptions = {
            page: parseInt(b.pageNumber) || 1,
            limit: parseInt(b.pageSize) || C.PAGINATION_DEFAULT_PAGE_SIZE
        }

        var getStaffCount = function () {
            var defer = Q.defer();
            var query = Staff.find({});
            if (b.block != '')
                query = query.where('isBlock').equals(b.block)
            if (b.role != '')
                query = query.where('roles.roleName').equals(b.role)
            if (b.fromTime != '')
                query = query.where('lastLogin').gte(b.fromTime).lte(b.toTime);

            query.count().exec(function (err, staffCount) {
                if (!err) {
                    b.staffCount = staffCount;
                    defer.resolve(staffCount);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var getStaff = function (staffCount) {
            var defer = Q.defer();
            var query = Staff.find({});
            if (b.block != '')
                query = query.where('isBlock').equals(b.block)
            if (b.fromTime != '')
                query = query.where('lastLogin').gte(b.fromTime).lte(b.toTime);
            if (b.staffId != '')
                query = Chapter.find({ "staffId": { "$regex": b.staffId, '$options': 'i' } })
            if (b.role != '')
                query = query.where('roles.roleName').equals(b.role)
            if (b.email != '')
                query = Chapter.find({ "email": { "$regex": b.email, '$options': 'i' } })
            if (b.name != '')
                query = Chapter.find({ "name": { "$regex": b.name, '$options': 'i' } })
            if (b.mobile != '')
                query = Chapter.find({ "mobile": { "$regex": b.mobile, '$options': 'i' } })

            query.sort({ createdAt: - 1 }).skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, staff) {
                if (!err) {
                    if (staff == null || staff.length == 0) {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'No Staff found')
                        defer.reject(out);
                    } else {

                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, staff, err, U.getPaginationObject(staffCount, b.pageSize, b.pageNumber));
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getStaffCount()
            .then(function (staffCount) {
                return getStaff(staffCount)
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    });

    /**
         * @api {put} /api/staff/:id Update Staff details
         * @apiName Staff update
         * @apiDescription Staff update
         * @apiGroup Staff
         * @apiParam {string} userId . In Header -Updated by userid
         * @apiParam {string} authToken . In Header
         * @apiParam {string} apiKey . In Header
         * @apiParam {string} version . In Header
         * @apiParam {string} id . In Params - Id of that userId you want to edit
         * @apiParam {string} fullName . In body
         * @apiParam {string} mobile . In body  
         * @apiParam {string} designation .In body 
         * @apiParam {string} roles . In body
         * @apiParam {string} block . In body
         * @apiParam {string} isActive . In body
        */

    app.put('/api/staff/:id', function (req, res) {
        var out;
        var b = req.body;
        b.id = req.params.id;
        b.userId = req.headers.userid;
        var findStaff = function () {
            var defer = Q.defer();
            Staff.find({ _id: b.id }, function (err, staff) {
                if (!err) {
                    if (staff != null && staff.length > 0) {
                        defer.resolve(staff);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Staff not found');
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        var updateStaff = function (staff) {
            var defer = Q.defer();
            if (b.fullName == undefined) {
                fullName = staff[0].fullName;
            } else {
                fullName = b.fullName;
            }
            if (b.mobile == undefined) {
                mobile = staff[0].mobile;
            } else {
                mobile = b.mobile;
            }
            if (b.roles == undefined) {
                roles = staff[0].roles;
            } else {
                roles = b.roles;
            }
            if (b.designation == undefined) {
                designation = staff[0].designation;
            } else {
                designation = b.designation;
            }
            if (b.block == undefined) {
                block = staff[0].isBlock;
            } else {
                block = b.block;
            }
            if (b.isActive == undefined) {
                isActive = staff[0].isActive;
            } else {
                isActive = b.isActive;
            }
            Staff.update({ _id: b.id },
                {
                    $set: { fullName: fullName, mobile: mobile, roles: roles, designation: designation, isBlock: block, isActive: isActive, updatedBy: b.userId }
                }, function (err, data) {
                    if (!err) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
                        defer.reject(out);
                    }
                })
            return defer.promise;
        };
        findStaff()
            .then(function (staff) {
                return updateStaff(staff);
            })
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
         * @api {delete} /api/staff/:id Delete an staff
         * @apiName Staff delete
         * @apiDescription Staff delete
         * @apiGroup Staff
         * @apiParam {string} userId . In Header -deleted by userid
         * @apiParam {string} authToken . In Header
         * @apiParam {string} apiKey . In Header
         * @apiParam {string} version . In Header
         * @apiParam {string} id . In Params - Id of that userId you want to delete
        */

    app.delete('/api/staff/:id', function (req, res) {
        var out;
        var b = {};
        b.id = req.params.id;
        b.userId = req.headers.userid;
        var deleteStaff = function () {
            var defer = Q.defer();
            Staff.update({ _id: b.id }, {
                $set: { isDeleted: 1 }
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
        deleteStaff()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
         * @api {get} /api/staff/:id Get staff detail
         * @apiName Staff detail
         * @apiDescription Staff detail
         * @apiGroup Staff
         * @apiParam {string} userId . In Header - viewed by userid
         * @apiParam {string} authToken . In Header
         * @apiParam {string} apiKey . In Header
         * @apiParam {string} version . In Header
         * @apiParam {string} id . In Params - Id of that userId you want to delete
         * @apiParam {string} staffDetails . In query - Pass flag 1 for staff details
         * @apiParam {string} accessRight . In query - Pass flag 1 for staff details
         * @apiParam {string} loginHistory . In query - Pass flag 1 for staff details
        */

    app.get('/api/staff/:id', function (req, res) {
        var out;
        var b = req.query;
        b.id = req.params.id;
        b.userId = req.headers.userid;
        var getStaffById = function () {
            var defer = Q.defer();
            var query = Staff.find({ _id: b.id});
            if (b.staffDetails != '') {
                query = Staff.find({ _id: b.id })
            } if (b.accessRight != '') {
                query = Staff.find({ _id: b.id }, { roles: 1 })
            }
            if (b.loginHistory != '') {
                query = LoginHistory.find({ _id: b.id })
            }
            query.exec(function (err, staff) {
                if (!err) {
                    if (staff != null && staff.length > 0) {
                        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, staff);
                        defer.resolve(out);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
                        defer.resolve(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            })
            return defer.promise;
        };
        getStaffById()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}