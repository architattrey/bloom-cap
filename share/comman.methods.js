var moment = require('moment-timezone');
var Student = require('./../models/student1.model');
var LoginDetail = require('./../models/loginHistory.model');
var Question = require('./../models/questions.model');
var U = require('./../share/util.api');
var Q = require('q');
var request = require("request");
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;


exports.loginHistory = function (userId, userName, deviceType) {
    var maintainLoginHistory = function () {
        var defer = Q.defer();
        var loginDetails = new LoginDetail();
        loginDetails.userId = userId;
        loginDetails.userName = userName;
        loginDetails.status = 'SUCCESS';
        loginDetails.loginTime = U.getTimeStamp();
        loginDetails.deviceType = deviceType;

        loginDetails.save(function (err, loginDetail) {
            if (!err) {
                defer.resolve();
            } else {
                defer.reject(err);
            }
        })
        return defer.promise;
    };
    maintainLoginHistory()
        .then(function () {
            console.log("Login History saved");
        })
        .fail(function () {
            console.log("Error in save loging history");
        })
}

exports.verifyUser = function (userId) {
    var defer = Q.defer();
    Student.find({
        _id: userId
    }, function (err, user) {
        if (!err) {
            if (user == null || user.length == 0) {
                out = U.getJson(401, 'You are not registered with us', { userId });
                defer.reject(out);
            } else {
                defer.resolve(user[0]);
            }
        } else {
            out = U.getJson(300, 'STATUS_ERR_UNKNOWN', userId, err);
            defer.reject(out);
        }
    })
    return defer.promise;
}

//  Append userId in question collection
exports.updateQuestion = function (question, userId) {
    var defer = Q.defer();
    Question.update({
        _id: question[0]._id
    }, {
            $addToSet: {
                users: {
                    userId: userId
                },
                userIds: userId
            }
        }, function (err, data) {
            if (!err) {
                defer.resolve(question);
            } else {
                defer.resolve(question);
            }
        })
    return defer.promise;
};

exports.getAnswer = function (questionId, userId) {
    var defer = Q.defer();
    Question.aggregate([{
        $match: {
            "_id": Mongoose.Types.ObjectId(questionId)
        }
    },
    {
        $project: {
            answer: 1
        }
    }
    ], function (err, answer) {
        if (!err) {
            if (answer != null && answer.length > 0) {
                defer.resolve(answer[0].answer);
            } else {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Answer for this question is not available', b);
                U.logError("getAnswer", 'Answer for this question is not available', b);
                defer.reject(out);
            }
        } else {
            out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
            U.logError("getAnswer", C.STATUS_ERR_DB, b, err);
            defer.reject(out);
        }
    })
    return defer.promise;
};