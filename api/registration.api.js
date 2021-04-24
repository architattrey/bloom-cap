// var Q = require('q');
// var http = require('https');
// var querystring = require('querystring');
// var fs = require('fs');
// var ses = require('node-ses');
// var request = require('request');
// var C = require('./../constant');
// var Mongoose = require('mongoose');
// var csvParser = require('csv-parse');
// var mongoXlsx = require('mongo-xlsx');
// var U = require('./../share/util.api');
// var mailer = require('./../share/send.mail');
// var Student = require('./../models/registration.model');



// module.exports = function (app) {

//     /
//      * @api {post} /api/students Student Registration
//      * @apiName Register new student
//      * @apiDescription Register new student
//      * @apiGroup Students
//      * @apiParam {string} apiKey . In Header
//      * @apiParam {string} version . In Header
//      * @apiParam {string} schoolName . In body
//      * @apiParam {string} name . In body  
//      * @apiParam {string} class . In body 
//      * @apiParam {string} city . In body 
//      * @apiParam {string} state . In body 
//      * @apiParam {string} dob .In body 
//      * @apiParam {number} gender .In body  1 for MALE 0 for FEMALE
//      * @apiParam {string} motherName .In body 
//      * @apiParam {string} fatherName .In body 
//      * @apiParam {string} guardianName .In body 
//      * @apiParam {string} email .In body 
//      * @apiParam {string} motherMobileNo .In body 
//      * @apiParam {string} fathetMobileNo .In body 
//      * @apiParam {string} guardianMobileNo .In body 
//      * @apiParam {string} trainerName .In body 
//      * @apiParam {string} registrationDate .In body 
//      * @apiParam {string} password .In body 
//      * @apiParam {string} studentMobileNo .In body 
//      */

//     app.post('/api/students', function (req, res) {
//         var out;
//         var b = req.body;
//         b.userId = req.headers.userid;
//         console.log('Data from body', b);
//         var registerStudent = function () {
//             var defer = Q.defer();
//             var student = new Student();
//             student.schoolName = b.schoolName;
//             student.authToken = U.generateRandomToken();
//             student.name = b.name;
//             student.class = b.class;
//             student.section = b.section;
//             student.dob = b.dob;
//             student.gender = b.gender;
//             student.motherName = b.motherName;
//             student.fatherName = b.fatherName;
//             student.guardianName = b.guardianName;
//             student.email = b.email;
//             student.city = b.city;
//             student.citySlug = b.city.toLowerCase();
//             student.state = b.state;
//             student.motherMobileNo = b.motherMobileNo;
//             student.fatherMobileNo = b.fatherMobileNo;
//             student.guardianMobileNo = b.guardianMobileNo;
//             student.studentMobileNo = b.studentMobileNo;
//             student.password = b.password;
//             student.timestamp = U.getTimeStamp();

//             student.save(function (err, data) {
//                 if (!err) {
//                     out = U.getJson(C.STATUS_SUCCESS_CODE, 'Thank you for sharing your information with us. We will be communicating with you soon.', b);
//                     defer.resolve(out);
//                 } else {
//                     if (err.code == 11000) {
//                         if (err.errmsg.includes("fatherMobileNo"))
//                             out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Father Mobile No already exist.', b);
//                         else {
//                             out = U.getJson(C.STATUS_ERR_KNOWN_CODE, 'Email already exist.', b);
//                         }
//                         defer.reject(out);
//                     }
//                     out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
//                     defer.reject(out);
//                 }
//             });
//             return defer.promise;
//         };
//         registerStudent()
//             .then(function (out) {
//                 //res.status = C.STATUS_SUCCESS_CODE;
//                 res.json(out);
//                 // console.log('success');
//                 // res.setHeader('Content-Type', 'application/json');
//                 // res.send(JSON.stringify(out));

//             })
//             .fail(function (out) {
//                 res.setHeader('Content-Type', 'application/json');
//                 res.send(JSON.stringify(out));
//             })
//     });

//     /
//      * @api {get} /api/admin/students Get all students
//      * @apiName Get all students
//      * @apiDescription Get all students
//      * @apiGroup Students
//      * @apiParam {string} apiKey . In Header
//      * @apiParam {string} version . In Header
//      * @apiParam {string} pageNumber . In Query Param
//      * @apiParam {string} pageSize . In Query Param
//      * @apiParam {string} name . In Query Param   name is student name
//      */

//     app.get('/api/admin/students', function (req, res) {
//         var b = {};
//         b.pageNumber = req.query.pageNumber == undefined ? 1 : req.query.pageNumber;
//         b.pageSize = req.query.pageSize == undefined ? C.PAGINATION_DEFAULT_PAGE_SIZE : req.query.pageSize;
//         b.name = req.query.name == undefined ? '' : req.query.name;
//         var pageOptions = {
//             page: parseInt(b.pageNumber),
//             limit: parseInt(b.pageSize)
//         }
//         var getUserCount = function () {
//             var defer = Q.defer();
//             var query = Student.find({
//                 isActive: true
//             });
//             if (b.name != '') {
//                 query = Student.find({
//                     "name": {
//                         "$regex": b.name,
//                         '$options': 'i'
//                     }
//                 });
//             }
//             query
//                 .count()
//                 .exec(function (err, studentCount) {
//                     if (!err) {
//                         b.studentCount = studentCount;
//                         defer.resolve();
//                     } else {
//                         defer.resolve();
//                     }
//                 })
//             return defer.promise;
//         };
//         var getUser = function () {
//             var defer = Q.defer();
//             var query = Student.find({
//                 isActive: 1
//             });
//             if (b.name != '') {
//                 query = Student.find({
//                     "name": {
//                         "$regex": b.name,
//                         '$options': 'i'
//                     }
//                 })
//             }
//             query.sort({
//                 createdAt: -1
//             }).populate("segment subSegment school", 'name').skip(pageOptions.limit * (pageOptions.page - 1)).limit(pageOptions.limit).exec(function (err, students) {
//                 if (!err) {
//                     if (students != null || students.length > 0) {
//                         out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, students, err, U.getPaginationObject(b.studentCount, pageOptions.limit, pageOptions.page));
//                         defer.resolve(out);
//                     } else {
//                         out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA, b);
//                         defer.reject(out);
//                     }
//                 } else {
//                     out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, b, err);
//                     defer.reject(out);
//                 }
//             })
//             return defer.promise;
//         };
//         getUserCount()
//             .then(function () {
//                 return getUser();
//             })
//             .then(function (out) {
//                 res.json(out);
//             })
//             .fail(function (out) {
//                 res.json(out);
//             })
//     })

//     /
//      * @api {post} /api/admin/excel/students Import excel
//      * @apiName Import excel
//      * @apiDescription Import excel
//      * @apiGroup Students
//      * @apiParam {string} apiKey . In Header
//      * @apiParam {string} version . In Header
//      * @apiParam {string} fileUrl . In body
//      */

//     app.post('/api/admin/excel1/students', function (req, res) {
//         var model;
//         var users = [];
//         var out = {};
//         var failedData = [];
//         var b = req.body;
//         try {
//             var xlsx = JSON.parse(req.body.fileUrl);
//         } catch (e) {
//             out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Can not read from file", b, e);
//             res.json(out);
//         }
//         var geJsonFromExcel = function () {
//             var defer = Q.defer();
//             var excelFile = "./studentData.xlsx";
//             downloadFile(xlsx, excelFile, function (downloadedFile) {
//                 console.log("excel json : ");
//                 mongoXlsx.xlsx2MongoData(excelFile, model, function (err, data) {
//                     if (!err) {
//                         console.log("data from length", data.length);
//                         defer.resolve(data);
//                     } else {
//                         out = U.getJson(C.STATUS_ERR_KNOWN_CODE, C.STATUS_ERR_NO_DATA);
//                         defer.reject(out);
//                     }
//                 })
//             });
//             return defer.promise;
//         };
//         var downloadFile = function (url, dest, cb) {
//             var file = fs.createWriteStream(dest);
//             var request = http.get(url, function (response) {
//                 response.pipe(file);
//                 file.on('finish', function () {
//                     file.close(cb);
//                 });
//             });
//         }

//         var insertStudent = function (data) {
//             var defer = Q.defer();
//             try {
//                 student = new Student();
//                 student.schoolName = data.schoolName;
//                 student.name = data.name;
//                 student.class = data.class;
//                 student.section = data.section;
//                 student.dob = data.dob;
//                 student.gender = data.gender;
//                 student.motherName = data.motherName;
//                 student.guardianMobileNo = data.guardianMobileNo;
//                 student.fatherName = data.fatherName;
//                 student.motherMobileNo = data.motherMobileNo;
//                 student.email = data.email;
//                 student.address = data.address;
//                 student.registrationDate = data.registrationDate;
//                 student.fatherMobileNo = data.fatherMobileNo;
//                 student.trainerName = data.trainerName;
//                 student.studentMobileNo = data.studentMobileNo;
//                 student.segments = Mongoose.Types.ObjectId(data.segmentId);
//                 student.subSegments = Mongoose.Types.ObjectId(data.subSegmentId);
//                 student.school = Mongoose.Types.ObjectId(data.schoolId);
//                 student.save(function (err, result) {
//                     if (!err) {
//                         defer.resolve(result);
//                     } else {
//                         data.errorMessage = "Seems this data already exists";
//                         defer.reject(data);
//                     }
//                 })
//             } catch (e) {
//                 data.errorMessage = "Error in parsing data";
//                 defer.reject(data);
//             }

//             return defer.promise;
//         };
//         geJsonFromExcel()
//             .then(function (data) {
//                 var promiseToInsert = [];
//                 for (var i = 0; i < data.length; i++) {
//                     var student = data[i];
//                     if (student && student.name) {
//                         // console.log("Ready to add : " + JSON.stringify(student));
//                         promiseToInsert.push(insertStudent(student));
//                     }
//                 }
//                 if (promiseToInsert.length > 0) {
//                     Q.allSettled(promiseToInsert)
//                         .then(function (results) {
//                             results.forEach(function (result) {
//                                 if (result.state === "fulfilled") {
//                                     users.push(result.value);
//                                 } else {
//                                     var reason = result.reason;
//                                     failedData.push(result.reason);
//                                     console.log("failed reason : " + JSON.stringify(reason));
//                                 }
//                             });

//                             if (users.length > 0) {
//                                 //  Send welcome mail asynchronusly
//                                 // An object of options to indicate where to post to
//                                 var names = users.map(u => u.name);
//                                 var emails = users.map(u => u.email);
//                                 var numbers = users.map(u => u.studentMobileNo);
//                                 U.sendWelcomeMail(emails, names);
//                                 U.sendWelcomeSms(numbers)
//                             }

//                             var totalData = {};
//                             totalData.succeedData = users;
//                             totalData.failedData = failedData;
//                             res.json(U.getJson(C.STATUS_SUCCESS_CODE, totalData.succeedData.length + " data inserted and " + totalData.failedData.length + " failed", totalData));
//                         })
//                 } else {
//                     res.json(U.getJson(C.STATUS_ERR_KNOWN_CODE, "No rows are available to insert or incorrect file"));
//                 }
//             })
//             .fail(function (out) {
//                 res.json(out);
//             })
//     })

//     app.post('/api/send/mail', function (req, res) {
//         var out;
//         var sendMail = function () {
//             var defer = Q.defer();
//             client = ses.createClient({
//                 key: 'AKIAIFNXRGXG437KQ7UA',
//                 secret: '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'
//             });

//             // Give SES the details and let it construct the message for you. 
//             client.sendEmail({
//                 to: 'irfan@irinnovative.com',
//                 from: 'manish@irinnovative.com',
//                 cc: 'manish@irinnovative.com',
//                 bcc: ['manish@irinnovative.com', 'manish@irinnovative.com'],
//                 subject: 'Test mail from bloom',
//                 message: 'hi this is an test mail from bloom foundation',
//                 altText: 'plain text'
//             }, function (err, data, res) {
//                 if (!err) {
//                     out = U.getJson(C.STATUS_SUCCESS_CODE, C.STATUS_SUCCESS, res);
//                     defer.resolve(out);
//                 } else {
//                     console.log("Erro in send mail :- ", err);
//                     out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, C.STATUS_ERR_UNKNOWN, err);
//                     defer.reject(out);
//                 }
//             });

//             return defer.promise;
//         }
//         sendMail()
//             .then(function (out) {
//                 res.json(out);
//             })
//             .fail(function (out) {
//                 res.jso(out);
//             })
//     })
//     app.get('/api/mailtest', function (req, res) {
//         shootMail();
//     })

//     function shootMail(users) {
//         if (users && users.length > 0) {
//             var names = users.map(u => u.name);
//             var emails = users.map(u => u.email);
//         }
//         var postData = querystring.stringify({
//             'name': 'Irfan1,Irfan2',
//             'mailTo': 'irfaan.aa@gmail.com,irfan@irinnovative.com'
//         })
//         console.log("post data : " + postData);
//         var post_options = {
//             host: 'dev-bloom-api.herokuapp.com',
//             port: '80',
//             path: '/api/mail/welcome',
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded',
//                 'Content-Length': Buffer.byteLength(postData)
//             }
//         };
//         var post_req = http.request(post_options, function (res) {
//             res.setEncoding('utf8');
//             res.on('data', function (chunk) {
//                 console.log('Mail Response: ' + chunk);
//             });
//             res.on('error', function (err) {
//                 console.log('Mail err: ' + err);
//             });
//         });
//     }
// }