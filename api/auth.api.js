var Q = require('q');
var C = require('./../constant');
var request = require('request');
var Mongoose = require('mongoose');
var U = require('./../share/util.api');
var User = require('./../models/users.model');
var COM = require('./../share/comman.methods');
var Student = require('./../models/student1.model');

module.exports = function (app) {

  /**
   * @api {post} /api/users/login Users login
   * @apiName login
   * @apiDescription Login
   * @apiGroup Users
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} userName . In body .User Name  studentMobileNo
   * @apiParam {string} password . In body  
   * @apiParam {string} pushId . In body 
   * @apiParam {string} deviceType . In body like Android|Ios
   * @apiParam {string} imeiNo . In body 
   * @apiParam {string} pushId . In body 
   * {
   *   "status": C.STATUS_SUCCESS_CODE,
   *   "message": "success",
   *   "data": [
   *     {
   *         "_id": "5a153f81b7d42610f8435ad8",
   *         "studentMobileNo": "7000628392",
   *         "guardianMobileNo": "9910669836",
   *         "motherMobileNo": "0987654323",
   *         "state": "U.P",
   *         "city": "Ghaziabad",
   *         "school": {
   *             "_id": "5a141fd193b0593e1fe107d3",
   *             "name": "School1"
   *         },
   *         "subSegment": {
   *             "_id": "59fefe6b37ae9900043a32df",
   *             "name": "XII"
   *         },
   *         "segment": {
   *             "_id": "59f706b2a60ca20004bd463a",
   *             "name": "CBSE"
   *         },
   *         "email": "irfaan@gmail.com",
   *         "guardianName": "TEST",
   *         "fatherName": "TEST",
   *         "motherName": "TEST",
   *         "gender": "1",
   *         "dob": "05/08/1970",
   *        "name": "IRFAAN",
   *         "authToken": "7HZPH2O1",
   *         "proileImage": ""
   *     }
   *   ],
   *   "paginate": {},
   *   "error": {}
   *   }
   */

  app.post('/api/users/login', function (req, res) {
    var out;
    var authToken = U.generateRandomToken();
    var b = req.body;
    // console.log("Input from request", req.body);
    var userLogin = function (err, user) {
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
        var query = Student.find({
          email: b.userName,
          password: b.password
        }, {
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
          });
      } else {
        var query = Student.find({
          studentMobileNo: b.userName,
          password: b.password
        }, {
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
          });
      }
      query.populate('subSegment segment', 'name').exec(function (err, user) {
        if (!err) {
          if (user != null && user.length != 0) {
            COM.loginHistory(user[0]._id, b.userName, b.deviceType);
            defer.resolve(user);
          } else {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Invalid credentials!', b);
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
      Student.update({
        _id: user[0]._id
      }, {
          $set: {
            authToken: authToken,
            "deviceDetails.pushId": b.pushId,
            "deviceDetails.imeiNo": b.imeiNo,
            "deviceDetails.deviceType": b.deviceType
          }
        }, {
          upsert: true
        }, function (err, data) {
          if (!err) {
            defer.resolve(user);
          } else {
            defer.resolve(user);
          }
        })
      return defer.promise;
    };
    userLogin()
      .then(function (user) {
        return updateDeviceDetails(user);
      })
      .then(function (user) {
        out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, user);
        res.json(out);
      })
      .fail(function (out) {
        res.json(out);
      })
  })

  /**
   * @api {get} /api/admin/gets3url/:fileName Provides S3 URL
   * @apiName Generate S3 url
   * @apiDescription Generates S3 url for uploading of files without exposing secret keys publically
   * @apiGroup Util
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} fileName . In url 
   */
  app.get('/api/admin/gets3url/:fileName', function (req, res) {
    const AWS = require('aws-sdk')
    var accessKeyId = C.AWS_ACCESS_KEY;
    var secretKey = C.AWS_SECRET_KEY;
    const myBucket = C.AWS_BUCKET;
    const myKey = req.params.fileName;

    // const myKey = "filefds.jpg";
    AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretKey,
      signatureVersion: 'v4',
      // region: 'us-east-1'
    });
    // AWS.config.region = 'us-east-1';
    //taken directly from http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html

    var s3 = new AWS.S3();
    var params = {
      Bucket: myBucket,
      Key: myKey
    };
    var url = s3.getSignedUrl('putObject', params);
    // console.log(url);

    res.json(U.getJson(C.STATUS_SUCCESS_CODE, url));
  })

  /**
     * @api {get} /api/validate/:key/:value Validate
     * @apiName Validate
     * @apiDescription Validate user email, contact number
     * @apiGroup User
     * @apiParam {string} apiKey . In Header
     * @apiParam {string} userId . In Header - This id will be excluded in validation
     * @apiParam {string} key . In Path (email, mobile)
     * @apiParam {string} value . In Path
     */

  app.get('/api/validate/:key/:value', function (req, res) {
    var out;
    var b = req.params;
    b.userId = req.headers.userid;
    var validateUser = function () {
      var defer = Q.defer();
      var query = Student.find({
        isDeleted: false
      });
      if (b.key == 'email') {
        query.where('email').equals(b.value);
      }
      else if (b.key == 'mobile') {
        query.where('studentMobileNo').equals(b.value);
      } else {
        out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Provided params are not supported", b);
        defer.reject(out);
      }
      if (b.userId && b.userId != '') {
        query.where('_id').ne(Mongoose.Types.ObjectId(b.userId));
      }

      query.exec(function (err, users) {
        if (!err) {
          if (users && users.length > 0) {
            if (b.key == 'email') {
              out = U.getJson(C.STATUS_SUCCESS_CODE, "error", b);
            }
            else if (b.key == 'mobile') {
              out = U.getJson(C.STATUS_SUCCESS_CODE, "error", b);
            } else {
              out = U.getJson(C.STATUS_SUCCESS_CODE, "error", b);
            }
          } else {
            out = U.getJson(C.STATUS_SUCCESS_CODE, "success", users);
          }
          defer.resolve(out);
        } else {
          out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
          defer.reject(out);
        }
      });
      return defer.promise;
    };
    validateUser()
      .then(function (out) {
        res.json(out);
      })
      .fail(function (out) {
        res.json(out);
      });
  });
};