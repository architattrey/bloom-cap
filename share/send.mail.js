var api_key = 'key-e254378da133d83a7ba11de340c24e7c';
var domain = 'mail.bloomcap.org';
var C = require('./../constant');
var mailgun = require("mailgun-js")({ apiKey: api_key, domain: domain });
var request = require("request");
var U = require('./../share/util.api');
var Q = require('q');
var fs = require('fs'),
    path = require('path');
module.exports = function (app) {

    //  This api was being used on web but now its not being used anywhere
    app.post('/api/sendMail', function (req, res) {
        var b = {};

        b.frm_name = req.body.frm_name;
        b.frm_email = req.body.frm_email;
        b.frm_message = req.body.frm_message;
        console.log('data from body', b);
        var out;
        var sendMail = function () {
            var defer = Q.defer();
            var from = 'Bloom Education Foundation Inquiry manager <no-reply@just100dollar.com>'
            var message = 'Name:' + b.frm_name + '\r\nEmail:  ' + b.frm_email + '\r\nPhone No: ' + b.frm_message + '';
            var mailTo = 'krishna.jha@ninetriangles.com';
            var subject = '[Bloom Education Foundation : Enquiry ] : From ' + b.frm_email;
            var bcc = ["irfan@irinnovative.com", "nishant.bansal1980@gmail.com"];

            var data = {
                from: from,
                to: mailTo,
                subject: subject,
                text: message,
                bcc: bcc
            };

            mailgun.messages().send(data, function (error, body) {
                if (!error) {
                    out = U.getJson(C.STATUS_SUCCESS_CODE, 'Your enquiry has been Sent. Our representative will connect with your shortly.', body);
                    defer.resolve(out);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, 'Please provide all detail to submit enquiry', b, error);
                    defer.reject(out);
                }
            });
            return defer.promise;
        };
        sendMail()
            .then(function (out) {
                res.json(out);
            })
            .fail(function (out) {
                res.json(out);
            })
    })

    /**
    * @api {post} /api/mail/welcome Send welcome mail
    * @apiName Send welcome mail
    * @apiDescription This api has to be utilized during first registration by user through excel, mobile app or web. This api is being called after excel upload
    * @apiGroup Mail
    * @apiParam {string} apiKey . In Header
    * @apiParam {string} version . In Header
    * @apiParam {array<string>} name . In body   student names ['name1','name2'];
    * @apiParam {array<string>} mailTo . In body   mailTo ['email@gmail.com','email2@gmail.com']
    */
    app.post('/api/mail/welcome', function (req, res) {
        var b = req.body;
        b.mailTo = b.mailTo.split(",");
        b.name = b.name.split(",");
        var defer = Q.defer();
        console.log('data from body', b);
        var out;
        if (b.name && b.name.length > 0 && b.mailTo && b.mailTo.length > 0) {
            var from = 'Bloom Cap Registration <no-reply@just100dollar.com>'
            // var mailTo = 'irfan@adcoretechnologies.com';
            var subject = '[Bloom Cap : Registration ]';
            var filePath = path.join(__dirname + "/template", 'mail_welcome.html');
            console.log("filepath : " + filePath);
            fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
                if (!err) {
                    var succeedCount = 0;
                    var failedCount = 0;
                    for (var i = 0; i < b.mailTo.length; i++) {
                        //  Replace placeholder
                        var htmlBody = data.replace("{{name}}", b.name[i]);
                        sendMail(from, b.mailTo[i], subject, "", htmlBody)
                            .then(function (out) {
                                succeedCount++;
                            })
                            .fail(function (out) {
                                console.log("Mail sent failed : " + JSON.stringify(out));
                                failedCount++;
                            })
                    }
                    out = U.getJson(C.STATUS_SUCCESS_CODE, b.mailTo.length + " mail queued", b);
                    res.json(out);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN, "Not able to read mail template", filePath, err);
                    res.json(out);
                }
            });
        } else {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide student names and their email id", b);
            res.json(out);
        }
    })

    //  AFIK its not being used anywhere
    var sendWelcomeMail = function (mailTo, name) {
        // mailTo = mailTo.split(",");
        // name = name.split(",");
        var defer = Q.defer();
        var out;
        if (name && name.length > 0 && mailTo && mailTo.length > 0) {
            var from = 'Bloom Cap Registration <no-reply@just100dollar.com>'
            // var mailTo = 'irfan@adcoretechnologies.com';
            var subject = '[Bloom Cap : Registration ]';
            var filePath = path.join(__dirname + "/template", 'mail_welcome.html');
            console.log("filepath : " + filePath);
            fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
                if (!err) {
                    var succeedCount = 0;
                    var failedCount = 0;
                    for (var i = 0; i < mailTo.length; i++) {
                        //  Replace placeholder
                        var htmlBody = data.replace("{{name}}", name[i]);
                        sendMail(from, mailTo[i], subject, "", htmlBody)
                            .then(function (out) {
                                succeedCount++;
                            })
                            .fail(function (out) {
                                console.log("Mail sent failed : " + JSON.stringify(out));
                                failedCount++;
                            })
                    }
                    out = U.getJson(C.STATUS_SUCCESS_CODE, mailTo.length + " mail queued");
                    defer.resolve(out);
                } else {
                    out = U.getJson(C.STATUS_ERR_UNKNOWN, "Not able to read mail template", filePath, err);
                    defer.reject(out);
                }
            });
        } else {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide student names and their email id");
            defer.reject(out);
        }
        return defer.promise;
    }

    //  AFIK its not being used anywhere
    function sendMail(from, mailTo, subject, bodyText, bodyHtml, bcc = "", attachment = null) {
        var defer = Q.defer();
        var data = {};
        var out = {};
        data.from = from;
        data.to = mailTo;
        data.subject = subject;

        //  Validation
        if (!from || !mailTo || !subject) {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please check from and to mail and subject", data);
            defer.reject(out);
        }
        if (bodyText && bodyText != "")
            data.text = bodyText;
        else if (bodyHtml && bodyHtml != "")
            data.html = bodyHtml;
        else {
            out = U.getJson(C.STATUS_ERR_KNOWN_CODE, "Please provide mail body", data);
            defer.reject(out);
        }
        if (bcc && bcc.length > 0)
            data.bcc = bcc;
        if (attachment != null)
            data.attachment = attachment;
        mailgun.messages().send(data, function (error, body) {
            if (!error) {
                out = U.getJson(C.STATUS_SUCCESS_CODE, 'success', body);
                defer.resolve(out);
            } else {
                out = U.getJson(C.STATUS_ERR_UNKNOWN_CODE, 'failed', data, error);
                defer.reject(out);
            }
        });
        return defer.promise;
    }
}

