var U = require('./../share/util.api');
var C = require('./../constant');
var COM = require('./../share/comman.methods');
var Staff = require('./../models/staffManagement.model');
var request = require('request');
var Q = require('q');
module.exports = function (app) {

    /**
     * @api {post} /api/admin/staffs/login Admin login
     * @apiName login
     * @apiDescription Login
     * @apiGroup Admin
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} version . In Header
     * @apiParam {string} userName . In body .User Name can be email or mobile
     * @apiParam {string} password . In body  
     * @apiParam {string} pushId . In body 
     * @apiParam {string} deviceType . In body
     * @apiParam {string} imeiNo . In body 
     * @apiParam {string} pushId . In body 
     */

    app.post('/api/admin/staffs/login', function (req, res) {
        var out;
        var b = req.body;
        console.log("Input from request", req.body);
        var adminLogin = function (err, user) {
            var defer = Q.defer();
            if (b.userName == undefined || b.userName == '') {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "User Name can't be blank", b);
                defer.reject(out);
            }
            if (b.password == undefined || b.password == '') {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Password can't be blank", b);
                defer.reject(out);
            }
            if (b.userName.includes('@')) {
                var query = Staff.find({
                    email: b.userName,
                    password: b.password
                }, {
                        roles: 1,
                        staffId: 1,
                        email: 1,
                        mobile: 1,
                        fullName: 1,
                        lastLogin: 1,
                        designation: 1
                    });
            } else {
                var query = Staff.find({
                    mobile: b.userName,
                    password: b.password
                }, {
                        roles: 1,
                        staffId: 1,
                        email: 1,
                        mobile: 1,
                        fullName: 1,
                        lastLogin: 1,
                        designation: 1
                    });
            }
            query.exec(function (err, user) {
                if (!err) {
                    if (user != null && user.length != 0) {
                        COM.loginHistory(user[0]._id, b.userName, b.deviceType);
                        defer.resolve(user);
                    } else {
                        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Invalid credentials', b);
                        defer.reject(out);
                    }
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        var updateDeviceDetails = function (user) {
            var defer = Q.defer();
            User.update({
                _id: user[0]._id
            }, {
                    $set: {
                        "deviceDetails.pushId": b.pushId,
                        "deviceDetails.imeiNo": b.imeiNo,
                        "deviceDetails.deviceType": b.deviceType
                    }
                }, function (err, data) {
                    if (!err) {
                        defer.resolve(user);
                    } else {
                        defer.resolve(user);
                    }
                })
            return defer.promise;
        };
        adminLogin()
            .then(function (user) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })
}