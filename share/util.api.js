var Q = require('q');
var request = require("request");
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
var moment = require('moment-timezone');
const uuidV1 = require('uuid/v1');
var LoginDetail = require('./../models/loginHistory.model');

var api_key = 'key-e254378da133d83a7ba11de340c24e7c';
var domain = 'mail.bloomcap.org';
var C = require('./../constant');
var mailgun = require("mailgun-js")({ apiKey: api_key, domain: domain });
var fs = require('fs'),
	path = require('path');
var https = require('https');

function getPagination(q) {
	var p = {};
	try {
		p.pageNumber = q.pageNumber && q.pageNumber != "" ? parseInt(q.pageNumber) : 1;
	} catch (e) { p.pageNumber = 1; }
	try {
		p.limit = q.pageSize && q.pageSize != "" ? parseInt(q.pageSize) : C.PAGINATION_DEFAULT_PAGE_SIZE;
	} catch (e) { p.limit = C.PAGINATION_DEFAULT_PAGE_SIZE; }
	p.skip = (p.pageNumber - 1) * p.limit;
	p.pageSize = q.pageSize;
	return p;
}

exports.getPagination = getPagination;

function getFilter(q, keyName, shouldFormArray) {
	var j = {};
	for (var k in q) {
		//  Check key name
		if (k == keyName && q.hasOwnProperty(k)) {
			//  Check if array is to be formed
			if (shouldFormArray) {
				if (q[k] && q[k] != undefined) {
					var datum = q[k].split("|");
					var dataArray = datum.map(function (d) {
						if (Mongoose.Types.ObjectId.isValid(d))
							return Mongoose.Types.ObjectId(d);
						else return undefined;
					});
					//  Filter only valid values
					j = dataArray.filter(function (d) {
						return d;
					});
				}
			} else {
				if (q[k] && q[k] != undefined && Mongoose.Types.ObjectId.isValid(q[k]))
					j[keyName] = Mongoose.Types.ObjectId(q[k]);
				else
					j[keyName] = "";
			}
			break;
		}
	}
	return j;
}

exports.getFilter = getFilter;

var getJson = function (code, message, data, error, pagination) {
	var out = {};
	out.status = code;
	out.message = message;
	if (data) {
		if (data.constructor === {}.constructor)
			out.data = [data];
		else
			out.data = data;
	} else out.data = [{}];
	if (pagination) {
		out.pagination = pagination;
	} else {
		out.pagination = {};
	}
	if (error) {
		error.internalMessage = "Error : " + error;
		error.internalMessageJson = "Error json : " + JSON.stringify(error);
		out.error = error;
	} else out.error = {};

	return out;
}
exports.getJson = getJson;

exports.getTime = function () {
	var utc = moment(new Date().toISOString);
	return utc.tz('Asia/Kolkata').format('YYYY:MM:DD hh:mm:ss');
}
var getTime = function () {
	var utc = moment(new Date());
	return utc.tz('Asia/Kolkata').format('YYYY:MM:DD hh:mm:ss');
}
exports.getTimeToDisplay = getTimeToDisplay;

var getTimeToDisplay = function () {
	// var moment = require('moment-timezone');
	var utc = moment(new Date());
	return utc.tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm:ss A');
}
exports.getDateFormat = function () {
	var date = new Date();
	var d = date.getFullYear();
	var mm = (date.getMonth() + 1)
	if (mm < 10)
		mm = '0' + mm;
	var dd = date.getDate()
	if (dd < 10)
		dd = '0' + dd;
	var returnDate = d + '-' + mm + '-' + dd;
	return returnDate;
}

exports.getRandomPassword = function () {
	var length = 6;
	var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var result = '';
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}
exports.generateRandomStaffId = function () {
	var length = 6;
	var result = '';
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var digits = "0123456789";
	for (var i = length; i > 4; --i) {
		result += chars[Math.round(Math.random() * (chars.length - 1))];
	}
	for (var i = (length / 2) + 1; i > 0; --i) {
		result += digits[Math.round(Math.random() * (digits.length - 1))];
	}
	return result;
}

exports.getOTP = function () {
	var length = 4;
	var chars = '0123456789';
	var result = '';
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}

exports.generateRandomToken = function () {
	var length = 8;
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var result = '';
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}
exports.generateScannerCode = function () {
	var length = 16;
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var result = '';
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}

exports.getRandomNumber = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.getTimeStamp = function () {
	var timestamp = +new Date();
	return timestamp;
}

function getTimeStamp() {
	var timestamp = +new Date();
	return timestamp;
}
exports.getPaginationObject = function (count, pageSize, pageNumber) {
	var paginate = {};
	paginate.total = count
	paginate.pageSize = pageSize;
	paginate.pageNumber = pageNumber;

	return paginate;
}
exports.logError = function (methodName, message, input, error) {
	console.log("Method Name:-", methodName, " Message :-", message, "Error :-", error);

}
exports.stringToObjectId = function (str) {
	var ids = str.split("|");
	//var objectIdsArr = ids.map(function (o) { return Mongoose.Types.ObjectId(o) })
	return ids;
}

exports.loginHistory = function (userId, userName) {
	var maintainLoginHistory = function () {
		var defer = Q.defer();
		var loginDetails = new LoginDetail();
		return defer.promise;
	};
}

exports.getDeletedName = function (name) {
	return 'X-' + name + '-' + getTimeStamp();
}

exports.getUid = function () {
	return uuidV1();
}

//  This method is being used by bloom website to send mail after registration
exports.sendRegistrationMail = function (name, email, message) {
	// mailTo = mailTo.split(",");
	// name = name.split(",");
	var defer = Q.defer();
	var out;
	if (name && email && message) {
		var from = 'Bloom Education Foundation Inquiry manager <no-reply@just100dollar.com>'
		var mailTo = 'krishna.jha@ninetriangles.com';
		// var mailTo = 'irfan@adcoretechnologies.com';
		var subject = '[Bloom Education Foundation : Enquiry ] : From ' + email;
		var bcc = ["irfan@irinnovative.com", "nishant.bansal1980@gmail.com"];
		// var bcc = ["irfan@irinnovative.com"];
		var filePath = path.join(__dirname + "/template", 'mail_registration.html');
		fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
			if (!err) {
				var succeedCount = 0;
				var failedCount = 0;
				//  Replace placeholder
				var htmlBody = data.replace("{{name}}", name);
				var htmlBody = htmlBody.replace("{{email}}", email);
				var htmlBody = htmlBody.replace("{{message}}", message);
				sendMail(from, mailTo, subject, "", htmlBody, bcc)
					.then(function (out) {
						succeedCount++;
					})
					.fail(function (out) {
						console.log("Mail sent failed : " + JSON.stringify(out));
						failedCount++;
					})
				out = getJson(C.STATUS_SUCCESS_CODE, mailTo.length + " mail queued");
				defer.resolve(out);
			} else {
				out = getJson(C.STATUS_ERR_UNKNOWN, "Not able to read mail template", filePath, err);
				defer.reject(out);
			}
		});
	} else {
		out = getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide student names and their email id");
		defer.reject(out);
	}
	return defer.promise;
}

exports.sendWelcomeMail = function (mailTo, name) {
	var defer = Q.defer();
	var out;
	if (name && name.length > 0 && mailTo && mailTo.length > 0) {
		if (mailTo.length != name.length) {
			out = getJson(C.STATUS_ERR_KNOWN_CODE, "Number of names and emails are not equal", { "emails": mailTo, "name": name });
			defer.reject(out);
		} else {
			var from = 'BloomCAP Registration <no-reply@mail.bloomcap.org>';
			// var mailTo = 'irfan@adcoretechnologies.com';
			var subject = '[BloomCAP : Registration ]';
			var filePath = path.join(__dirname + "/template", 'mail_welcome.html');
			console.log("filepath : " + filePath);
			fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
				if (!err) {
					var succeedCount = 0;
					var failedCount = 0;
					var mailPromise = [];
					for (var i = 0; i < mailTo.length; i++) {
						//  Replace placeholder
						var htmlBody = data.replace("{{name}}", name[i]);
						mailPromise.push(sendMail(from, mailTo[i], subject, "", htmlBody));
					}
					Q.allSettled(mailPromise)
						.then(function (results) {
							results.forEach(function (result) {
								if (result.state === "fulfilled") {
									succeedCount++;
								} else {
									var reason = result.reason;
									failedCount++;
									console.log("Mail sent failed : " + JSON.stringify(reason));
								}
							});
							out = getJson(C.STATUS_SUCCESS_CODE, succeedCount + "Mail queued successfully and " + failedCount + " failed");
							console.log(succeedCount + " Mail queued successfully and " + failedCount + " failed");
							defer.resolve(out);
						})

				} else {
					out = getJson(C.STATUS_ERR_UNKNOWN, "Not able to read mail template", filePath, err);
					defer.reject(out);
				}
			});
		}
	} else {
		out = getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide student names and their email id");
		defer.reject(out);
	}
	return defer.promise;
}

function sendMail(from, mailTo, subject, bodyText, bodyHtml, bcc = "", attachment = null) {
	var defer = Q.defer();
	var data = {};
	var out = {};
	data.from = from;
	data.to = mailTo;
	data.subject = subject;

	//  Validation
	if (!from || !mailTo || !subject) {
		out = getJson(C.STATUS_ERR_KNOWN_CODE, "Please check from and to mail and subject", data);
		defer.reject(out);
	}
	if (bodyText && bodyText != "")
		data.text = bodyText;
	else if (bodyHtml && bodyHtml != "")
		data.html = bodyHtml;
	else {
		out = getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide mail body", data);
		defer.reject(out);
	}
	if (bcc && bcc.length > 0)
		data.bcc = bcc;
	if (attachment != null)
		data.attachment = attachment;
	mailgun.messages().send(data, function (error, body) {
		if (!error) {
			out = getJson(C.STATUS_SUCCESS_CODE, 'success', body);
			defer.resolve(out);
		} else {
			out = getJson(C.STATUS_ERR_UNKNOWN_CODE, 'failed', data, error);
			defer.reject(out);
		}
	});
	return defer.promise;
}

exports.sendWelcomeSms = function (numbers) {
	var defer = Q.defer();
	var out;
	var succeedCount = 0;
	var failedCount = 0;
	var sendSMSPromise = [];
	if (numbers && numbers.length > 0) {
		for (var i = 0; i < numbers.length; i++) {
			var bodyText = "Thank you for registering with BloomCAP School Program. Get FREE access to hundreds of question & solution designed by Leading Authors. Download our app now. Play Store - http://bit.ly/2BZAbat. App Store - https://apple.co/2Ek0ltN";
			sendSMSPromise.push(sendSms(bodyText, numbers[i]));
		}
		Q.allSettled(sendSMSPromise)
			.then(function (results) {
				results.forEach(function (result) {
					if (result.state === "fulfilled") {
						succeedCount++;
					} else {
						var reason = result.reason;
						failedCount++;
						console.log("Sms sent failed : " + JSON.stringify(reason));
					}
				});
				out = getJson(C.STATUS_SUCCESS_CODE, succeedCount + " SMS queued successfully and " + failedCount + " failed");
				console.log(succeedCount + " SMS queued successfully and " + failedCount + " failed");
				defer.resolve(out);
			})

	} else {
		out = getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide mobile numbers and otps to sent");
		defer.reject(out);
	}
	return defer.promise;
}

exports.sendOtp = function (numbers, otps) {
	var defer = Q.defer();
	var out;
	var succeedCount = 0;
	var failedCount = 0;
	var sendSMSPromise = [];
	if (numbers && numbers.length > 0 && otps && otps.length > 0) {
		if (numbers.length != otps.length) {
			out = getJson(C.STATUS_ERR_KNOWN_CODE, "Mobile number and otp count are not equal", { "numbers": numbers, "otps": otps });
			defer.reject(out);
		} else {
			for (var i = 0; i < numbers.length; i++) {
				var bodyText = otps[i] + " is your one time password (OTP) for BloomCAP login on " + getTimeToDisplay();
				sendSMSPromise.push(sendSms(bodyText, numbers[i]));
			}
			Q.allSettled(sendSMSPromise)
				.then(function (results) {
					results.forEach(function (result) {
						if (result.state === "fulfilled") {
							succeedCount++;
						} else {
							var reason = result.reason;
							failedCount++;
							console.log("Sms sent failed : " + JSON.stringify(reason));
						}
					});
					out = getJson(C.STATUS_SUCCESS_CODE, succeedCount + " SMS queued successfully and " + failedCount + " failed");
					console.log(succeedCount + " SMS queued successfully and " + failedCount + " failed");
					defer.resolve(out);
				})
		}
	} else {
		out = getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide mobile numbers and otps to sent");
		defer.reject(out);
	}
	return defer.promise;
}

function sendSms(bodyText, number) {
	var defer = Q.defer();
	var out;
	bodyText = encodeURIComponent(bodyText);
	var pattern = new RegExp("%20", 'g');
	bodyText = bodyText.replace(pattern, '+');
	console.log(bodyText)
	var smsApiUrl = "https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=GvBJ66dBnUu7mX8J3ugqbg&senderid=BLMCAP&channel=2&DCS=0&flashsms=0&number=" + number
		+ "&text=" + bodyText + "&route=13";
	// console.log("SMS url : " + smsApiUrl);
	var request = https.get(smsApiUrl,
		function (response) {
			if (response.statusCode == C.STATUS_SUCCESS_CODE) {
				defer.resolve(response.status);
			} else {
				defer.reject(response.status);
			}
		});
	return defer.promise;
}