var Q = require("q");
var fs = require("fs");
var http = require("https");
var ses = require("node-ses");
var request = require("request");
var C = require("./../constant");
var Mongoose = require("mongoose");
var csvParser = require("csv-parse");
var mongoXlsx = require("mongo-xlsx");
var U = require("./../share/util.api");
var querystring = require("querystring");
var mailer = require("./../share/send.mail");
var Student = require("./../models/student1.model");
var School = require("./../models/school.model");

module.exports = function(app) {
  /**
   * @api {post} /api/v1/students Student Registration
   * @apiName Register new student
   * @apiDescription Register new student
   * @apiGroup Mobile
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} userId . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} name . In body  - Mandatory
   * @apiParam {string} profileImage . In body
   * @apiParam {string} dob .In body
   * @apiParam {number} gender .In body  MALE | FEMALE |OTHERS
   * @apiParam {string} email .In body
   * @apiParam {string} password .In body - Mandatory
   * @apiParam {string} studentMobileNo .In body- Mandatory
   * @apiParam {string} fatherName .In body
   * @apiParam {string} motherName .In body
   * @apiParam {string} guardianName .In body
   * @apiParam {string} motherMobileNo .In body
   * @apiParam {string} fatherMobileNo .In body
   * @apiParam {string} guardianMobileNo .In body
   * @apiParam {string} isSchool .In body true if board is selected else false if competition exam is selected
   * @apiParam {string} segmentId .In body - Mandatory
   * @apiParam {string} subSegmentId .In body - Mandatory
   * @apiParam {string} state . In body
   * @apiParam {string} city . In body
   * @apiParam {string} schoolId .In body
   * @apiParam {string} pushId .In body - Mandatory
   * @apiParam {string} imeiNo .In body
   * @apiParam {string} deviceType .In body (android | ios | web | excel)
   * @apiParam {string} loginMethod .In body (facebook | google | manual)
   * @apiParam {string} socialToken .In body (optional if loginMethod is manual, mandatory if loginMethod is set as facebook/google
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "status": C.STATUS_SUCCESS_CODE,
   *   "message": "success",
   *   "data": [
   *   {
   *       "_id": "5a15469a2558422490e2c2d2",
   *       "createdAt": "2017-11-22T09:42:50.397Z",
   *       "updatedAt": "2017-11-22T09:42:50.397Z",
   *       "studentMobileNo": "7000628392",
   *       "guardianMobileNo": "9910669836",
   *      "motherMobileNo": "0987654323",
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
   *       "authToken": "DPQYWMJH",
   *       "profileImage": ""
   *   }
   *   ],
   *   "paginate": {},
   *   "error": {}
   *   }
   */

  app.post("/api/v1/students", function(req, res) {
    var out;
    var b = JSON.parse(req.body.body);
    b.userId = req.headers.userid;
    console.log("Data for registration", JSON.stringify(b));
    var registerStudent = function(schoolId) {
      var defer = Q.defer();
      var today = U.getDateFormat();
      var student = new Student();
      student.authToken = U.generateRandomToken();
      student.timestamp = U.getTimeStamp();
      student.school = schoolId;
      student.name = b.name;
      student.section = b.section;
      student.dob = b.dob;
      student.gender = b.gender;
      student.motherName = b.motherName;
      student.fatherName = b.fatherName;
      student.guardianName = b.guardianName;
      student.email = b.email;
      student.segment = b.segmentId;
      student.subSegment = b.subSegmentId;
      student.city = b.city;
      student.state = b.state;
      student.motherMobileNo = b.motherMobileNo;
      student.fatherMobileNo = b.fatherMobileNo;
      student.guardianMobileNo = b.guardianMobileNo;
      student.studentMobileNo = b.studentMobileNo;
      student.password = b.password;
      student.isSchool = b.isSchool ? b.isSchool : true;
      student.registrationDate = b.registrationDate
        ? b.registrationDate
        : today;
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

      student.save(function(err, data) {
        if (!err) {
          b.userId = data._id;
          out = U.getJson(C.STATUS_SUCCESS_CODE, "success", data);
          defer.resolve(out);
        } else {
          if (err.code == 11000) {
            if (err.errmsg.includes("studentMobileNo"))
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "Mobile No already exist.",
                b
              );
            else {
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "Email already exist.",
                b
              );
            }
            defer.reject(out);
          }
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
    var updateProfile = function() {
      var defer = Q.defer();
      Student.find(
        {
          _id: b.userId
        },
        function(err, user) {
          if (!err) {
            if (user == null || user.length == 0) {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "User not found", b);
              defer.reject(out);
            } else {
              //console.log("user result", user);
              if (b.password) {
                password = b.password;

                var objectToUpdate = {};
                name = b.name ? b.name : user[0].name;
                email = b.email ? b.email : user[0].email;
                gender = b.gender ? b.gender : user[0].gender;
                profileImage = b.profileImage
                  ? b.profileImage
                  : user[0].profileImage;
                isSchool = b.isSchool ? b.isSchool : user[0].isSchool;
                segment = b.segmentId ? b.segmentId : user[0].segment;
                subSegment = b.subSegmentId
                  ? b.subSegmentId
                  : user[0].subSegment;
                pushId = b.pushId ? b.pushId : user[0].pushId;
                imeiNo = b.imeiNo ? b.imeiNo : user[0].imeiNo;
                deviceType = b.deviceType ? b.deviceType : user[0].deviceType;
                deviceType = b.deviceType ? b.deviceType : user[0].deviceType;
                if (b.loginMethod == "facebook") {
                  facebookSocialToken = b.socialToken;
                  googleSocialToken = user[0].googleSocialToken;
                } else if (b.loginMethod == "google") {
                  googleSocialToken = b.socialToken;
                  facebookSocialToken = user[0].facebookSocialToken;
                } else {
                  googleSocialToken = user[0].googleSocialToken;
                  facebookSocialToken = user[0].facebookSocialToken;
                }
                Student.update(
                  {
                    _id: b.userId
                  },
                  {
                    $set: {
                      name: name,
                      email: email,
                      gender: gender,
                      password: password,
                      isSchool: isSchool,
                      segment: segment,
                      subSegment: subSegment,
                      profileImage: profileImage,
                      "deviceDetails.pushId": pushId,
                      "deviceDetails.imeiNo": imeiNo,
                      "deviceDetails.deviceType": deviceType,
                      "deviceDetails.facebookSocialToken": facebookSocialToken,
                      "deviceDetails.googleSocialToken": googleSocialToken,
                      "deviceDetails.googleSocialToken": U.getTimeStamp()
                    }
                  },
                  {
                    upsert: true
                  },
                  function(err, user) {
                    if (!err) {
                      defer.resolve();
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
              } else {
                out = U.getJson(
                  C.STATUS_ERR_KNOWN_CODE,
                  "Please provide password",
                  b
                );
                defer.reject(out);
              }
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
    var getUser = function() {
      var defer = Q.defer();
      Student.find(
        {
          _id: b.userId
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
      )
        .populate("subSegment segment", "name")
        .exec(function(err, updatedUser) {
          if (!err) {
            out = U.getJson(
              C.STATUS_SUCCESS_CODE,
              C.STATUS_SUCCESS,
              updatedUser
            );
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
    var findSchool = function(schoolId, schoolName) {
      var defer = Q.defer();
      var query = School.find({
        isDeleted: false
      });
      if (schoolId) query.where("_id").equals(schoolId);
      else query.where("name").equals(schoolName);

      query.exec(function(err, data) {
        if (!err) {
          if (data && data.length > 0) {
            //  We have found the school
            var school = data[0];
            defer.resolve(school.schoolId);
          } else {
            addSchool(b.schoolName, b.state, b.city)
              .then(function(newSchool) {
                defer.resolve(newSchool._id);
              })
              .fail(function(err) {
                defer.reject(err);
              });
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

    var addSchool = function(schoolName, state, city) {
      var defer = Q.defer();
      var school = new School();
      school.name = b.schoolName;
      school.city = b.city;
      school.state = b.state;
      school.iconUrl = "";
      school.bannerUrl = "";
      school.createdById = b.userId;
      school.timestamp = U.getTimeStamp();

      school.save(function(err, data) {
        if (!err) {
          console.log("school id after insert : " + data._id);
          School.update(
            { _id: data._id },
            { $set: { schoolId: data._id } },
            { upsert: true },
            function(updateError, updatedData) {
              if (updateError) {
                console.log(
                  "error while saving school. Removing last inserted one"
                );
                School.find({ id: data._id })
                  .remove()
                  .exec();
                out = U.getJson(
                  C.STATUS_ERR_KNOWN_CODE,
                  "Failed to create school",
                  data,
                  updateError
                );
                defer.reject(out);
              } else {
                var schooId = data._id;
                defer.resolve(data);
              }
            }
          );
        } else {
          if (err.code == 11000) {
            out = U.getJson(
              C.STATUS_ERR_KNOWN_CODE,
              "Seems this data already exist !",
              b
            );
            defer.reject(out);
          }
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

    if (b.userId == "" || b.userId == undefined) {
      findSchool(b.schoolId, b.schoolName)
        .then(function(schoolId) {
          b.schoolId = schoolId;
          return registerStudent(schoolId);
        })
        .then(function() {
          return getUser();
        })
        .then(function(out) {
          res.json(out);
        })
        .fail(function(out) {
          res.json(out);
        });
    } else {
      updateProfile()
        .then(function() {
          return getUser();
        })
        .then(function(out) {
          res.json(out);
        })
        .fail(function(out) {
          res.json(out);
        });
    }
  });

  app.post("/api/students", function(req, res) {
    var out;
    var b = req.body;
    b.userId = req.headers.userid;
    console.log("Data for registration", JSON.stringify(b));
    var registerStudent = function() {
      var defer = Q.defer();
      var today = U.getDateFormat();
      var student = new Student();
      student.authToken = U.generateRandomToken();
      student.timestamp = U.getTimeStamp();
      student.school = b.schoolId;
      student.name = b.name;
      student.section = b.section;
      student.dob = b.dob;
      student.gender = b.gender;
      student.motherName = b.motherName;
      student.fatherName = b.fatherName;
      student.guardianName = b.guardianName;
      student.email = b.email;
      student.segment = b.segmentId;
      student.subSegment = b.subSegmentId;
      student.city = b.city;
      student.state = b.state;
      student.motherMobileNo = b.motherMobileNo;
      student.fatherMobileNo = b.fatherMobileNo;
      student.guardianMobileNo = b.guardianMobileNo;
      student.studentMobileNo = b.studentMobileNo;
      student.password = b.password;
      student.isSchool = b.isSchool ? b.isSchool : true;
      student.registrationDate = b.registrationDate
        ? b.registrationDate
        : today;
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

      student.save(function(err, data) {
        if (!err) {
          b.userId = data._id;
          out = U.getJson(C.STATUS_SUCCESS_CODE, "success", data);
          defer.resolve(out);
        } else {
          if (err.code == 11000) {
            if (err.errmsg.includes("fatherMobileNo"))
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "Father Mobile No already exist.",
                b
              );
            else {
              out = U.getJson(
                C.STATUS_ERR_KNOWN_CODE,
                "Email already exist.",
                b
              );
            }
            defer.reject(out);
          }
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
    var updateProfile = function() {
      var defer = Q.defer();
      Student.find(
        {
          _id: b.userId
        },
        function(err, user) {
          if (!err) {
            if (user == null || user.length == 0) {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "User not found", b);
              defer.reject(out);
            } else {
              //console.log("user result", user);
              if (b.password) {
                password = b.password;

                var objectToUpdate = {};
                name = b.name ? b.name : user[0].name;
                email = b.email ? b.email : user[0].email;
                gender = b.gender ? b.gender : user[0].gender;
                profileImage = b.profileImage
                  ? b.profileImage
                  : user[0].profileImage;
                isSchool = b.isSchool ? b.isSchool : user[0].isSchool;
                segment = b.segmentId ? b.segmentId : user[0].segment;
                subSegment = b.subSegmentId
                  ? b.subSegmentId
                  : user[0].subSegment;
                pushId = b.pushId ? b.pushId : user[0].pushId;
                imeiNo = b.imeiNo ? b.imeiNo : user[0].imeiNo;
                deviceType = b.deviceType ? b.deviceType : user[0].deviceType;
                deviceType = b.deviceType ? b.deviceType : user[0].deviceType;
                if (b.loginMethod == "facebook") {
                  facebookSocialToken = b.socialToken;
                  googleSocialToken = user[0].googleSocialToken;
                } else if (b.loginMethod == "google") {
                  googleSocialToken = b.socialToken;
                  facebookSocialToken = user[0].facebookSocialToken;
                } else {
                  googleSocialToken = user[0].googleSocialToken;
                  facebookSocialToken = user[0].facebookSocialToken;
                }
                Student.update(
                  {
                    _id: b.userId
                  },
                  {
                    $set: {
                      name: name,
                      email: email,
                      gender: gender,
                      password: password,
                      isSchool: isSchool,
                      segment: segment,
                      subSegment: subSegment,
                      profileImage: profileImage,
                      "deviceDetails.pushId": pushId,
                      "deviceDetails.imeiNo": imeiNo,
                      "deviceDetails.deviceType": deviceType,
                      "deviceDetails.facebookSocialToken": facebookSocialToken,
                      "deviceDetails.googleSocialToken": googleSocialToken,
                      "deviceDetails.googleSocialToken": U.getTimeStamp()
                    }
                  },
                  {
                    upsert: true
                  },
                  function(err, user) {
                    if (!err) {
                      defer.resolve();
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
              } else {
                out = U.getJson(
                  C.STATUS_ERR_KNOWN_CODE,
                  "Please provide password",
                  b
                );
                defer.reject(out);
              }
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
    var getUser = function() {
      var defer = Q.defer();
      Student.find(
        {
          _id: b.userId
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
      )
        .populate("subSegment segment", "name")
        .exec(function(err, updatedUser) {
          if (!err) {
            out = U.getJson(
              C.STATUS_SUCCESS_CODE,
              C.STATUS_SUCCESS,
              updatedUser
            );
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
    if (b.userId == "" || b.userId == undefined) {
      registerStudent()
        .then(function() {
          return getUser();
        })
        .then(function(out) {
          res.json(out);
        })
        .fail(function(out) {
          res.json(out);
        });
    } else {
      updateProfile()
        .then(function() {
          return getUser();
        })
        .then(function(out) {
          res.json(out);
        })
        .fail(function(out) {
          res.json(out);
        });
    }
  });

  /**
   * @api {get} /api/admin/students Get all students
   * @apiName Get all students
   * @apiDescription Get all students
   * @apiGroup Students
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} pageNumber . In Query Param
   * @apiParam {string} pageSize . In Query Param
   * @apiParam {string} name . In Query Param   name is student name
   */

  app.get("/api/admin/students", function(req, res) {
    var b = {};
    b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
    b.pageSize =
      req.query.pageSize == undefined
        ? C.PAGINATION_DEFAULT_PAGE_SIZE
        : req.query.pageSize;
    b.name = req.query.name == undefined ? "" : req.query.name;
    var pageOptions = {
      page: parseInt(b.pageNumber),
      limit: parseInt(b.pageSize)
    };
    var getUserCount = function() {
      var defer = Q.defer();
      var query = Student.find({
        isActive: true
      });
      if (b.name != "") {
        query = Student.find({
          name: {
            $regex: b.name,
            $options: "i"
          }
        });
      }
      query.count().exec(function(err, studentCount) {
        if (!err) {
          b.studentCount = studentCount;
          defer.resolve();
        } else {
          defer.resolve();
        }
      });
      return defer.promise;
    };
    var getUser = function() {
      var defer = Q.defer();
      var query = Student.find({
        isActive: 1
      });
      if (b.name != "") {
        query = Student.find({
          name: {
            $regex: b.name,
            $options: "i"
          }
        });
      }
      query
        .sort({
          createdAt: -1
        })
        .populate("segment subSegment", "name")
        .skip(pageOptions.limit * (pageOptions.page - 1))
        .limit(pageOptions.limit)
        .exec(function(err, students) {
          if (!err) {
            if (students != null || students.length > 0) {
              out = U.getJson(
                C.STATUS_SUCCESS_CODE,
                C.STATUS_SUCCESS,
                students,
                err,
                U.getPaginationObject(
                  b.studentCount,
                  pageOptions.limit,
                  pageOptions.page
                )
              );
              defer.resolve(out);
            } else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
              defer.reject(out);
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
    getUserCount()
      .then(function() {
        return getUser();
      })
      .then(function(out) {
        res.json(out);
      })
      .fail(function(out) {
        res.json(out);
      });
  });

  /**
   * @api {post} /api/admin/excel/students Import excel
   * @apiName Import excel
   * @apiDescription Import excel
   * @apiGroup Students
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} fileUrl . In body
   */

  app.post("/api/admin/excel/students", function(req, res) {
    var model;
    var users = [];
    var out = {};
    var failedData = [];
    var b = req.body;
    try {
      var xlsx = JSON.parse(req.body.fileUrl);
    } catch (e) {
      out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Can not read from file", b, e);
      res.json(out);
    }
    var geJsonFromExcel = function() {
      var defer = Q.defer();
      var excelFile = "./studentData.xlsx";
      downloadFile(xlsx, excelFile, function(downloadedFile) {
        console.log("excel json : ");
        mongoXlsx.xlsx2MongoData(excelFile, model, function(err, data) {
          if (!err) {
            console.log("data from length", data.length);
            defer.resolve(data);
          } else {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
            defer.reject(out);
          }
        });
      });
      return defer.promise;
    };
    var downloadFile = function(url, dest, cb) {
      var file = fs.createWriteStream(dest);
      var request = http.get(url, function(response) {
        response.pipe(file);
        file.on("finish", function() {
          file.close(cb);
        });
      });
    };

    var insertStudent = function(index, data) {
      var defer = Q.defer();
      var errorData = {};
      try {
        errorData.rowNo = index + 1;
        errorData.name = data.name;
        errorData.studentMobileNo = data.studentMobileNo;
        errorData.email = data.email;
        errorData.segmentId = data.segmentId;
        errorData.subSegmentId = data.subSegmentId;
        errorData.schoolId = data.schoolId;
        if (!Mongoose.Types.ObjectId.isValid(data.segmentId)) {
          errorData.errorMessage = "Segment Id is not correct";
          defer.reject(errorData);
        } else if (!Mongoose.Types.ObjectId.isValid(data.subSegmentId)) {
          errorData.errorMessage = "Sub Segment Id is not correct";
          defer.reject(errorData);
        } else if (Mongoose.Types.ObjectId.isValid(data.schoolId)) {
          School.findById(
            { _id: Mongoose.Types.ObjectId(data.schoolId) },
            function(err, schoolData) {
              if (!err && schoolData != null) {
                student = new Student();
                student.name = data.name;
                student.section = data.section;
                student.dob = data.dob;
                student.timestamp = U.getTimeStamp();
                student.gender = data.gender;
                student.state = schoolData.state;
                student.city = schoolData.city;
                student.motherName = data.motherName;
                student.guardianMobileNo = data.guardianMobileNo;
                student.fatherName = data.fatherName;
                student.motherMobileNo = data.motherMobileNo;
                student.email = data.email;
                student.address = data.address;
                student.registrationDate = data.registrationDate;
                student.registrationMethod = "Excel";
                student.fatherMobileNo = data.fatherMobileNo;
                student.trainerName = data.trainerName;
                student.studentMobileNo = data.studentMobileNo;
                student.segment = Mongoose.Types.ObjectId(data.segmentId);
                student.subSegment = Mongoose.Types.ObjectId(data.subSegmentId);
                student.school = Mongoose.Types.ObjectId(data.schoolId);
                defer.resolve(student);
                student.save(function(err, result) {
                  if (!err) {
                    defer.resolve(result);
                  } else {
                    errorData.errorMessage = "Seems this data already exists";
                    defer.reject(errorData);
                  }
                });
              } else {
                errorData.errorMessage = "Seems this school is not available";
                defer.reject(errorData);
              }
            }
          );
        } else {
          errorData.errorMessage = "Seems school id is not correct";
          defer.reject(errorData);
        }
      } catch (e) {
        errorData.errorMessage = "Error in parsing data";
        defer.reject(errorData);
      }

      return defer.promise;
    };
    geJsonFromExcel()
      .then(function(data) {
        var promiseToInsert = [];
        for (var i = 0; i < data.length; i++) {
          var student = data[i];
          if (student && student.name) {
            // console.log("Ready to add : " + JSON.stringify(student));
            promiseToInsert.push(insertStudent(i, student));
          }
        }
        if (promiseToInsert.length > 0) {
          Q.allSettled(promiseToInsert).then(function(results) {
            results.forEach(function(result) {
              if (result.state === "fulfilled") {
                users.push(result.value);
              } else {
                var reason = result.reason;
                failedData.push(result.reason);
                console.log("failed reason : " + JSON.stringify(reason));
              }
            });

            if (users.length > 0) {
              //  Send welcome mail asynchronusly
              // An object of options to indicate where to post to
              var names = users.map(u => u.name);
              var emails = users.map(u => u.email);
              var numbers = users.map(u => u.studentMobileNo);
              // U.sendWelcomeMail(emails, names);
              // U.sendWelcomeSms(numbers);
            }

            var totalData = {};
            totalData.succeedData = users;
            totalData.failedData = failedData;
            res.json(
              U.getJson(
                C.STATUS_SUCCESS_CODE,
                totalData.succeedData.length +
                  " data inserted and " +
                  totalData.failedData.length +
                  " failed",
                totalData
              )
            );
          });
        } else {
          res.json(
            U.getJson(
              C.STATUS_ERR_KNOWN_CODE,
              "No rows are available to insert or incorrect file"
            )
          );
        }
      })
      .fail(function(out) {
        res.json(out);
      });
  });

  /**
   * @api {put} /api/users/:id Update Student details
   * @apiName Update users
   * @apiDescription Update user details by user id
   * @apiGroup Mobile
   * @apiParam {string} userId . In Header
   * @apiParam {string} authToken . In Header
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} name . In url
   * @apiParam {string} email . In body
   * @apiParam {string} segmentId . In body
   * @apiParam {string} subSegmentId . In body
   * @apiParam {string} fatherMobileNo . In body
   * @apiParam {string} motherMobileNo . In body
   * @apiParam {string} guardianMobileNo . In body
   * @apiParam {string} fatherName . In body
   * @apiParam {string} motherName . In body
   * @apiParam {string} guardianName . In body
   * @apiParam {number} gender .In body  MALE | FEMALE |OTHERS
   * @apiParam {string} dob . In body
   * @apiParam {string} section . In body
   * @apiParam {string} profileImage . In body
   * @apiParam {string} state . In body
   * @apiParam {string} city . In body
   * @apiParam {string} pinCode . In body
   * @apiParam {string} schoolId .In body
   * @apiParam {string} pushId .In body
   * @apiParam {string} imeiNo .In body
   * @apiParam {string} deviceType .In body (android | ios | web)
   * @apiParam {string} loginMethod .In body (facebook | google | manual)
   * @apiParam {string} socialToken .In body (optional if loginMethod is manual, mandatory if loginMethod is set as facebook/google
   * @apiParam {string} isSchool .In body true if board is selected else false if competition exam is selected
   */

  app.put("/api/users/:id", function(req, res) {
    var out;
    var b = {};
    try {
      b = JSON.parse(req.body.body);
    } catch (e) {
      b = req.body;
    }
    b.userId = req.headers.userid;
    b.id = req.params.id;
    console.log("Data for update : " + JSON.stringify(b));
    var findUser = function() {
      var defer = Q.defer();
      Student.find(
        {
          _id: b.id
        },
        function(err, users) {
          if (!err) {
            if (users != null && users.length > 0) {
              defer.resolve(users);
            } else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
              defer.reject(out);
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
    var updateUser = function(user) {
      var defer = Q.defer();
      name = b.name ? b.name : user[0].name;
      email = b.email ? b.email : user[0].email;
      gender = b.gender ? b.gender : user[0].gender;
      profileImage = b.profileImage ? b.profileImage : user[0].profileImage;
      dob = b.dob ? b.dob : user[0].dob;
      section = b.section ? b.section : user[0].section;
      isSchool = b.isSchool ? b.isSchool : user[0].isSchool;
      state = b.state ? b.state : user[0].state;
      city = b.city ? b.city : user[0].city;
      pinCode = b.pinCode ? b.pinCode : user[0].pinCode;
      password = b.password ? b.password : user[0].password;
      school = b.schoolId ? b.schoolId : user[0].school;

      segment = b.segmentId ? b.segmentId : user[0].segment;
      profileImage = b.profileImage ? b.profileImage : user[0].profileImage;
      subSegment = b.subSegmentId ? b.subSegmentId : user[0].subSegment;

      fatherName = b.fatherName ? b.fatherName : user[0].fatherName;
      motherName = b.motherName ? b.motherName : user[0].motherName;
      guardianName = b.guardianName ? b.guardianName : user[0].guardianName;
      fatherMobileNo = b.fatherMobileNo
        ? b.fatherMobileNo
        : user[0].fatherMobileNo;
      motherMobileNo = b.motherMobileNo
        ? b.motherMobileNo
        : user[0].motherMobileNo;
      guardianMobileNo = b.guardianMobileNo
        ? b.guardianMobileNo
        : user[0].guardianMobileNo;

      pushId = b.pushId ? b.pushId : user[0].pushId;
      imeiNo = b.imeiNo ? b.imeiNo : user[0].imeiNo;
      deviceType = b.deviceType ? b.deviceType : user[0].deviceType;
      if (b.loginMethod == "facebook") {
        facebookSocialToken = b.socialToken;
        googleSocialToken = user[0].googleSocialToken;
      } else if (b.loginMethod == "google") {
        googleSocialToken = b.socialToken;
        facebookSocialToken = user[0].facebookSocialToken;
      } else {
        googleSocialToken = user[0].googleSocialToken;
        facebookSocialToken = user[0].facebookSocialToken;
      }

      Student.update(
        {
          _id: b.id
        },
        {
          $set: {
            name: name,
            email: email,
            profileImage: profileImage,
            gender: gender,
            dob: dob,
            password: password,
            segment: segment,
            subSegment: subSegment,
            section: section,
            fatherMobileNo: fatherMobileNo,
            motherMobileNo: motherMobileNo,
            guardianMobileNo: guardianMobileNo,
            fatherName: fatherName,
            motherName: motherName,
            guardianName: guardianName,
            state: state,
            city: city,
            pinCode: pinCode,
            school: school,
            isSchool: isSchool,
            "deviceDetails.pushId": pushId,
            "deviceDetails.imeiNo": imeiNo,
            "deviceDetails.deviceType": deviceType,
            "deviceDetails.facebookSocialToken": facebookSocialToken,
            "deviceDetails.googleSocialToken": googleSocialToken,
            "deviceDetails.timestamp": U.getTimeStamp()
          }
        },
        {
          upsert: true
        },
        function(err, data) {
          if (!err) {
            Student.find(
              {
                _id: b.id
              },
              {
                deviceDetails: 0,
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
                authToken: 0,
                __v: 0
              },
              function(err, user) {
                if (!err) {
                  out = U.getJson(
                    C.STATUS_SUCCESS_CODE,
                    C.STATUS_SUCCESS,
                    user
                  );
                  defer.resolve(out);
                } else {
                  out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "error", b);
                  defer.reject(out);
                }
              }
            );
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
    findUser()
      .then(function(users) {
        return updateUser(users);
      })
      .then(function(out) {
        res.json(out);
      })
      .fail(function(out) {
        res.json(out);
      });
  });

  /**
   * @api {post} /api/admin/reports/students Student report
   * @apiName Student report
   * @apiDescription Student report by city
   * @apiGroup Admin-Report
   * @apiParam {string} userId . In Header
   * @apiParam {string} authToken . In Header
   * @apiParam {string} apiKey . In Header
   * @apiParam {string} version . In Header
   * @apiParam {string} fromDate . In query
   * @apiParam {string} toDate . In query
   */

  app.get("/api/admin/reports/students", function(req, res) {
    var out;
    var b = {};
    //b.userId = req.headers.userid;
    var getCityCount = function() {
      var defer = Q.defer();
      Student.aggregate(
        [
          {
            $group: {
              _id: "$city", //$region is the column name in collection
              count: {
                $sum: 1
              }
            }
          }
        ],
        function(err, cityCount) {
          if (!err) {
            if (cityCount != null || cityCount.length > 0) {
              b.cityCount = cityCount;
              out = U.getJson(
                C.STATUS_SUCCESS_CODE,
                C.STATUS_SUCCESS,
                cityCount
              );
              defer.resolve();
            } else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
              defer.reject(out);
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

    var getTotalUserCount = function() {
      var defer = Q.defer();
      var query = Student.find({
        // isActive: true
      });
      query.count().exec(function(err, totalCount) {
        if (!err) {
          b.totalCount = totalCount;
          defer.resolve();
        } else {
          defer.resolve();
        }
      });
      return defer.promise;
    };
    var getActiveUserCount = function() {
      var defer = Q.defer();
      var query = Student.find({
        isActive: true
      });
      query.count().exec(function(err, activeCount) {
        if (!err) {
          b.activeCount = activeCount;
          defer.resolve();
        } else {
          defer.resolve();
        }
      });
      return defer.promise;
    };
    var getUserCountWithoutPassword = function() {
      var defer = Q.defer();
      Student.aggregate(
        [
          {
            $match: {
              password: ""
            }
          },
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          },
          {
            $project: {
              _id: 0
            }
          }
        ],
        function(err, withoutPassword) {
          if (!err) {
            if (withoutPassword != null && withoutPassword.length > 0) {
              b.withoutPassword = withoutPassword[0].count;
              defer.resolve();
            } else {
              b.withoutPassword = 0;
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
    var getUserCountWithoutEmail = function() {
      var defer = Q.defer();
      Student.aggregate(
        [
          {
            $match: {
              email: ""
            }
          },
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          },
          {
            $project: {
              _id: 0
            }
          }
        ],
        function(err, emailCount) {
          if (!err) {
            if (emailCount != null && emailCount.length > 0) {
              b.withoutEmailCount = emailCount[0].count;
              defer.resolve();
            } else {
              b.withoutEmailCount = 0;
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
    var getUserCountWithoutEmailAndMobile = function() {
      var defer = Q.defer();
      Student.aggregate(
        [
          {
            $match: {
              email: "",
              guardianMobileNo: "",
              motherMobileNo: ""
            }
          },
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          },
          {
            $project: {
              _id: 0
            }
          }
        ],
        function(err, count) {
          if (!err) {
            if (count != null && count.length > 0) {
              b.withoutEmailAndMobileCount = count[0].count;
              defer.resolve();
            } else {
              b.withoutEmailAndMobileCount = 0;
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
    var getUserCountWithoutMobile = function() {
      var defer = Q.defer();
      Student.aggregate(
        [
          {
            $match: {
              guardianMobileNo: "",
              motherMobileNo: ""
            }
          },
          {
            $group: {
              _id: null,
              count: {
                $sum: 1
              }
            }
          },
          {
            $project: {
              _id: 0
            }
          }
        ],
        function(err, mobileCount) {
          if (!err) {
            if (mobileCount != null && mobileCount.length > 0) {
              b.withoutMobileCount = mobileCount[0].count;
              defer.resolve();
            } else {
              b.withoutMobileCount = 0;
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

    var getUserCountByRegistrationMethod = function() {
      var defer = Q.defer();
      Student.aggregate(
        [
          {
            $match: {
              $or: [
                { registrationMethod: "android" },
                { registrationMethod: "excel" },
                { registrationMethod: "ios" }
              ]
            }
          },
          {
            $group: {
              _id: "$registrationMethod", //$region is the column name in collection
              count: {
                $sum: 1
              }
            }
          },
          {
            $project: {
              registrationMethod: "$_id",
              _id: 0,
              count: 1
            }
          }
        ],
        function(err, deviceDistribution) {
          if (!err) {
            if (deviceDistribution != null || deviceDistribution.length > 0) {
              b.deviceDistribution = deviceDistribution;
              out = U.getJson(
                C.STATUS_SUCCESS_CODE,
                C.STATUS_SUCCESS,
                deviceDistribution
              );
              defer.resolve();
            } else {
              out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
              defer.reject(out);
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
    getCityCount()
      .then(function(out) {
        return getTotalUserCount();
      })
      .then(function(out) {
        return getActiveUserCount();
      })
      .then(function(out) {
        return getUserCountWithoutPassword();
      })
      .then(function(out) {
        return getUserCountWithoutEmail();
      })
      .then(function() {
        return getUserCountWithoutEmailAndMobile();
      })
      .then(function() {
        return getUserCountWithoutMobile();
      })
      .then(function() {
        return getUserCountByRegistrationMethod();
      })
      .then(function(out) {
        var out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, b);
        res.json(out);
      })
      .fail(function(out) {
        res.json(out);
      });
  });
};
