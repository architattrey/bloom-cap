var Q = require("q");
var request = require("request");
var C = require("./../constant");
var Mongoose = require("mongoose");
var U = require("./../share/util.api");
var OTP = require("./../models/otp.model");
var User = require("./../models/users.model");
var COM = require("./../share/comman.methods");
var Student = require("./../models/student1.model");

module.exports = function (app) {
  /**
   * @api {post} /api/sendotp Send otp on mobile
   * @apiName Send otp
   * @apiDescription Send otp on mobile
   * FLOW OF SEND OTP OR LOGIN REGISTRATION :- At the time of sent otp respone you get an message key contain value 'otp' then
   * redirect user to varify otp and if mesage key contain value 'password' then redirect user to login with password screen
   * @apiGroup Mobile
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} forceOTP . In query param - true if you wanted to send OTP forcefully irrespective of whether user is having password set or not. Primarily used for Forgot password
   * @apiParam {string} mobile . In body sample value :- 8495898935
   * @apiSuccessExample {json} Success-Response:
   * {
   *  "status": C.STATUS_SUCCESS_CODE,
   *   "message": "success",
   *   "data": [
   *   {}
   *   ],
   *   "paginate": {},
   *   "error": {}
   *   }
   */

  app.post("/api/sendotp", function (req, res) {
    var out;
    var b = {};
    b.forceOTP = req.query.forceOTP;
    b.mobile = req.body.mobile;
    var mobile = [b.mobile];
    var otpCode = U.getOTP();
    var saveOtp = function (out) {
      var defer = Q.defer();
      if (b.mobile == null || b.mobile == undefined || b.mobile == "") {
        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide mobile", b);
        defer.reject(out);
      }
      var otp = new OTP();
      otp.mobile = b.mobile;
      otp.otp = otpCode;

      otp.save(function (err, data) {
        if (!err) {
          //out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS);
          defer.resolve(out);
        } else {
          out = U.getJson(
            C.STATUS_ERR_UNKNOWN_CODE,
            C.STATUS_ERR_UNKNOWN,
            b,
            err
          );
          defer.reject(out);
        }
      });
      return defer.promise;
    };
    var checkPassword = function () {
      var defer = Q.defer();
      Student.find(
        {
          studentMobileNo: b.mobile
        },
        function (err, student) {
          if (!err) {
            if (student != null && student.length > 0) {
              if (student[0].password == "") {
                out = U.getJson(C.STATUS_SUCCESS_CODE, "otp");
                defer.resolve(out);
              } else {
                out = U.getJson(C.STATUS_SUCCESS_CODE, "password");
                defer.resolve(out);
              }
            } else {
              out = U.getJson(C.STATUS_SUCCESS_CODE, "otp");
              defer.resolve(out);
            }
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.reject(out);
          }
        }
      );
      return defer.promise;
    };
    var checkMobile = function () {
      var defer = Q.defer();
      Student.find(
        {
          studentMobileNo: b.mobile
        },
        function (err, student) {
          if (!err) {
            if (!student || student.length == 0) {
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "mobile no not registered !",
                b
              );
              defer.reject(out);
            } else {
              defer.resolve();
            }
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.reject(out);
          }
        }
      );
      return defer.promise;
    };
    var sendOtp = function (out) {
      var defer = Q.defer();
      U.sendOtp(mobile, [otpCode]);
      defer.resolve(out);
      return defer.promise;
    };
    if (b.forceOTP && (b.forceOTP == true || b.forceOTP == "true")) {
      checkMobile()
        .then(function () {
          return saveOtp();
        })
        .then(function () {
          return sendOtp();
        })
        .then(function () {
          out = U.getJson(C.STATUS_SUCCESS_CODE, "otp");
          res.json(out);
        })
        .fail(function (out) {
          res.json(out);
        });
    } else {
      checkPassword()
        .then(function (out) {
          var defer = Q.defer();
          if (out.message == "otp") {
            saveOtp(out)
              .then(function (data) {
                sendOtp(out);
                defer.resolve(out);
              })
              .fail(function (e) {
                out = U.getJson(
                  C.STATUS_ERR_KNOWN_CODE,
                  "Provided mobile number is not correct",
                  b,
                  e
                );
                defer.reject(out);
              });
          } else {
            defer.resolve(out);
          }
          return defer.promise;
        })
        .then(function (out) {
          res.json(out);
        })
        .fail(function (out) {
          res.json(out);
        });
    }
  });

  /**
   * @api {post} /api/v2/otp/send Send otp on mobile
   * @apiName Send otp
   * @apiDescription Send otp on mobile flow
   * register - i/p - mobile, email. validation - mobile & email should not exist. o/p - otp.
   * login - i/p - mobile. validation - mobile should exist. o/p - if password available then password else otp.
   * forgot - i/p - mobile. validation - mobile should exist. o/p - otp.
   * @apiGroup Mobile
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} otpMode . In body. MODE_REGISTER, MODE_LOGIN, MODE_FORGOT
   * @apiParam {string} mobile . In body
   * @apiParam {string} email . In body (required for registeration)
   * @apiParam {string} otp . In body
   */
  app.post("/api/v2/otp/send", function (req, res) {
    var out;
    var b = req.body;

    //  register - i/p - mobile, email. validation - mobile & email should not exist. o/p - otp.
    //  login - i/p - mobile. validation - mobile should exist. o/p - if password available then password else otp.
    //  forgot - i/p - mobile. validation - mobile should exist. o/p - otp.

    var mobile = b.mobile;
    var otpCode = U.getOTP();
    var saveOtp = function () {
      var defer = Q.defer();
      if (b.mobile == null || b.mobile == undefined || b.mobile == "") {
        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide 10 digit mobile number", b);
        defer.reject(out);
      }
      var otp = new OTP();
      otp.mobile = b.mobile;
      otp.otp = otpCode;
      OTP.updateMany(
        {
          mobile: b.mobile
        },
        {
          $set: {
            isActive: false
          }
        },
        function (err, data) {
          otp.save(function (err, data) {
            if (!err) {
              out = U.getJson(C.STATUS_SUCCESS_CODE, "otp", b);
              defer.resolve(out);
            } else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide 10 digit mobile number", b, err);
              defer.reject(out);
            }
          });
        });
      return defer.promise;
    };

    var checkMobile = function (existanceCheck) {
      var defer = Q.defer();
      Student.findOne(
        {
          studentMobileNo: b.mobile
        },
        function (err, student) {
          if (!err) {
            if (!student) {
              //  If we are doing existance check then we failed to meet that
              if (existanceCheck) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Mobile number not registered", b);
                defer.reject(out);
              } else {
                defer.resolve(student);
              }
            } else {
              //  If we are doing existance check then we passed this test
              if (existanceCheck) {
                defer.resolve(student);
              } else {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Mobile number already registered", b);
                defer.reject(out);
              }
            }
          } else {
            out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
            defer.reject(out);
          }
        }
      );
      return defer.promise;
    };

    var checkEmail = function () {
      var defer = Q.defer();
      Student.findOne(
        {
          email: b.email
        },
        function (err, student) {
          if (!err) {
            if (!student) {
              defer.resolve();
            } else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Email already registered", b);
              defer.reject(out);
            }
          }
          else {
            out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
            defer.reject(out);
          }
        });
      return defer.promise;
    };

    var studentDetail = {};
    if (b.otpMode == 'MODE_LOGIN') {
      checkMobile(true)
        .then(function (data) {
          studentDetail = data;
          var defer = Q.defer();
          if (studentDetail.password && studentDetail.password != '') {
            //  password exists
            out = U.getJson(C.STATUS_SUCCESS_CODE, "password", b);
            defer.resolve(out);
          } else {
            //  generate otp and send
            saveOtp()
              .then(function (data) {
                U.sendOtp([mobile], [otpCode]);
                out = U.getJson(C.STATUS_SUCCESS_CODE, "otp", b);
                defer.resolve(out);
              })
              .fail(function (e) {
                out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Provided mobile number is not correct", b, e);
                defer.reject(out);
              });
          }
          return defer.promise;
        })
        .then(function (out) {
          res.json(out);
        })
        .fail(function (err) {
          res.json(err);
        });
    } else if (b.otpMode == 'MODE_FORGOT') {
      checkMobile(true)
        .then(function (data) {
          return saveOtp();
        })
        .then(function (data) {
          U.sendOtp([mobile], [otpCode]);
          out = U.getJson(C.STATUS_SUCCESS_CODE, "otp", b);
          res.json(out);
        })
        .fail(function (err) {
          res.json(err);
        });
    } else if (b.otpMode == 'MODE_REGISTER') {
      checkMobile(false)
        .then(function (data) {
          return checkEmail();
        })
        .then(function (data) {
          return saveOtp();
        })
        .then(function (data) {
          U.sendOtp([mobile], [otpCode]);
          out = U.getJson(C.STATUS_SUCCESS_CODE, "otp", b);
          res.json(out);
        })
        .fail(function (err) {
          res.json(err);
        });
    } else {
      out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Provided OTP mode is not correct", b);
      res.json(out);
    }
  });

  /**
   * @api {post} /api/v2/otp/verify Verify otp
   * @apiName Verify otp
   * @apiDescription Verify otp
   * register - i/p - mobile,otp,registrationBody. action - verify and then perform registration. o/p - user profile.
   * login - i/p - mobile,otp. action - verify and then get user profile o/p - user profile
   * forgot - i/p - mobile, otp. action - verify and then get user profile o/p - user profile
   * @apiGroup Mobile
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} otpMode . In body. MODE_REGISTER, MODE_LOGIN, MODE_FORGOT
   * @apiParam {string} mobile . In body
   * @apiParam {string} email . In body
   */
  app.post("/api/v2/otp/verify", function (req, res) {
    var out;
    var b = req.body;

    var verifyOtp = function () {
      var defer = Q.defer();
      OTP.find(
        {
          mobile: b.mobile,
          otp: b.otp,
          isActive: true
        },
        function (err, data) {
          if (!err) {
            if (data == null || data.length == 0) {
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "Please provide correct OTP",
                b
              );
              defer.reject(out);
            } else {
              b.otpId = data[0]._id;
              defer.resolve();
            }
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.reject(out);
          }
        }
      );
      return defer.promise;
    };
    var updateOtp = function () {
      var defer = Q.defer();
      OTP.update(
        {
          _id: b.otpId
        },
        {
          $set: {
            isActive: false
          }
        },
        function (err, data) {
          if (!err) {
            console.log("Otp update SuccessFully");
            defer.resolve();
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.resolve();
          }
        }
      );
      return defer.promise;
    };
    var getUserProfile = function () {
      var defer = Q.defer();
      if (b.mobile == undefined || b.mobile == "") {
        out = U.getJson(
          C.STATUS_ERR_KNOWN_CODE,
          "Mobile number can't be blank",
          b
        );
        defer.reject(out);
      }
      var query = Student.find(
        {
          studentMobileNo: b.mobile
        },
        {
          deviceDetails: 0,
          citySlug: 0,
          password: 0,
          mailVerificationUrlSentOn: 0,
          isDeleted: 0,
          isActive: 0,
          isSchool: 0,
          createdBy: 0,
          mailVerificationUrl: 0,
          otpSentOn: 0,
          otp: 0,
          isEmailVerified: 0,
          isMobileVerified: 0,
          schoolName: 0,
          __v: 0
        }
      );
      query
        .populate("segment subSegment", "_id name")
        .exec(function (err, user) {
          if (!err) {
            if (user != null && user.length != 0) {
              COM.loginHistory(user[0]._id, b.userName, b.deviceType);
              out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
              defer.resolve(out);
            } else {
              out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
              defer.resolve(out);
            }
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.reject(out);
          }
        });
      return defer.promise;
    };

    var performRegistration = function () {
      var defer = Q.defer();
      var today = U.getDateFormat();
      var student = new Student();
      student.authToken = U.generateRandomToken();
      student.timestamp = U.getTimeStamp();
      student.name = b.name;
      student.gender = b.gender;
      student.email = b.email;
      student.segment = b.segmentId;
      student.subSegment = b.subSegmentId;
      student.studentMobileNo = b.studentMobileNo;
      student.password = b.password;
      student.isSchool = b.isSchool ? b.isSchool : true;
      student.registrationDate = b.registrationDate ? b.registrationDate : today;
      student.deviceDetails.pushId = b.pushId;
      student.deviceDetails.imeiNo = b.imeiNo;
      student.deviceDetails.deviceType = b.deviceType;
      student.deviceDetails.timestamp = U.getTimeStamp();
      student.registrationMethod = b.deviceType;
      if (b.loginMethod == "facebook") {
        student.deviceDetails.facebookSocialToken = b.socialToken;
        student.deviceDetails.googleSocialToken = "";
      }
      if (b.loginMethod == "google") {
        student.deviceDetails.facebookSocialToken = "";
        student.deviceDetails.googleSocialToken = b.socialToken;
      }

      student.save(function (err, data) {
        if (!err) {
          b.userId = data._id;
          out = U.getJson(C.STATUS_SUCCESS_CODE, "success", [data]);
          defer.resolve(out);
        } else {
          if (err.code == 11000) {
            if (err.errmsg.includes("fatherMobileNo"))
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Father Mobile No already exist.", b);
            else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Email already exist.", b);
            }
            defer.reject(out);
          }
          out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
          defer.reject(out);
        }
      });
      return defer.promise;
    };

    if (b.otpMode == 'MODE_LOGIN' || b.otpMode == 'MODE_FORGOT') {
      verifyOtp()
        .then(function () {
          updateOtp();
          return getUserProfile();
        })
        .then(function (out) {
          res.json(out);
        })
        .fail(function (out) {
          res.json(out);
        });
    } else if (b.otpMode == 'MODE_REGISTER') {
      verifyOtp()
        .then(function () {
          updateOtp();
          return performRegistration();
        })
        .then(function (out) {
          res.json(out);
        })
        .fail(function (out) {
          res.json(out);
        });
    } else {
      out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Provided OTP mode is not correct", b);
      res.json(out);
    }


  });
  /**
   * @api {post} /api/verify/otp Verify otp
   * @apiName Verify otp
   * @apiDescription Verify otp
   * their is one key name data which is array if user already register with us than data key have user information and if
   * user not register with us then you get blank data key in that case call same api without userId.
   * for now we use default otp :- 4532
   * @apiGroup Mobile
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} otp . In body
   * @apiParam {string} mobile . In body
   * @apiSuccessExample {json} Success-Response:
   *   {
   *   "status": C.STATUS_SUCCESS_CODE,
   *   "message": "success",
   *   "data": [
   *   {
   *       "_id": "5a153f81b7d42610f8435ad8",
   *       "studentMobileNo": "7000628392",
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
   *       "email": "irfaan@gmail.com",
   *       "guardianName": "TEST",
   *       "fatherName": "TEST",
   *       "motherName": "TEST",
   *       "gender": "MALE",
   *       "dob": "05/08/1970",
   *       "name": "IRFAAN",
   *       "authToken": "7HZPH2O1",
   *       "proileImage": ""
   *       }
   *   ],
   *    "paginate": {},
   *   "error": {}
   *   }
   */

  app.post("/api/verify/otp", function (req, res) {
    var out;
    var b = req.body;
    var verifyOtp = function () {
      var defer = Q.defer();
      OTP.find(
        {
          mobile: b.mobile,
          otp: b.otp,
          isActive: true
        },
        function (err, data) {
          if (!err) {
            if (data == null || data.length == 0) {
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "Please provide correct OTP",
                b
              );
              defer.reject(out);
            } else {
              b.otpId = data[0]._id;
              defer.resolve();
            }
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.reject(out);
          }
        }
      );
      return defer.promise;
    };
    var updateOtp = function () {
      var defer = Q.defer();
      OTP.update(
        {
          _id: b.otpId
        },
        {
          $set: {
            isActive: false
          }
        },
        function (err, data) {
          if (!err) {
            console.log("Otp update SuccessFully");
            defer.resolve();
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.resolve();
          }
        }
      );
      return defer.promise;
    };
    var getUserProfile = function () {
      var defer = Q.defer();
      if (b.mobile == undefined || b.mobile == "") {
        out = U.getJson(
          C.STATUS_ERR_KNOWN_CODE,
          "Mobile number can't be blank",
          b
        );
        defer.reject(out);
      }
      var query = Student.find(
        {
          studentMobileNo: b.mobile
        },
        {
          deviceDetails: 0,
          citySlug: 0,
          password: 0,
          mailVerificationUrlSentOn: 0,
          isDeleted: 0,
          isActive: 0,
          isSchool: 0,
          createdBy: 0,
          mailVerificationUrl: 0,
          otpSentOn: 0,
          otp: 0,
          isEmailVerified: 0,
          isMobileVerified: 0,
          schoolName: 0,
          __v: 0
        }
      );
      query
        .populate("segment subSegment", "_id name")
        .exec(function (err, user) {
          if (!err) {
            if (user != null && user.length != 0) {
              COM.loginHistory(user[0]._id, b.userName, b.deviceType);
              out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
              defer.resolve(out);
            } else {
              out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
              defer.resolve(out);
            }
          } else {
            out = U.getJson(
              C.STATUS_ERR_UNKNOWN_CODE,
              C.STATUS_ERR_UNKNOWN,
              b,
              err
            );
            defer.reject(out);
          }
        });
      return defer.promise;
    };
    verifyOtp()
      .then(function () {
        updateOtp();
        return getUserProfile();
      })
      .then(function (out) {
        res.json(out);
      })
      .fail(function (out) {
        res.json(out);
      });
  });
};
