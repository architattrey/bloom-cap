module.exports = function (app, pool) {

    require('./api/otp.api')(app);
    require('./api/auth.api')(app);
    require('./api/meta.api')(app);
    require('./api/test.api')(app);
    require('./api/staff.api')(app);
    require('./api/users.api')(app);
    require('./api/units.api')(app);
    require('./api/school.api')(app);
    require('./api/topics.api')(app);
    require('./api/banner.api')(app);
    require('./share/send.mail')(app);
    require('./api/segments.api')(app);
    require('./api/subjects.api')(app);
    require('./api/chapters.api')(app);
    require('./api/practices1.api')(app);
    //require('./api/practices.api')(app);
    require('./api/questions.api')(app);
    require('./api/subSegments.api')(app);
    require('./api/student1.api')(app);
    require('./api/staffManagement.api')(app);
    require('./api/enquiry.api')(app);
    require('./api/videos.api')(app);
    require('./api/resources.api')(app);
    require('./api/scanners.api')(app);
    require('./api/reports.api')(app);


    app.get('/', function (req, res) {
        res.send("Welcome to Bloom API. Contact irfan@adcoretechnologies.com to get access on latest api document. Environment - " + process.env.NODE_ENV);
    });
    app.get('/docs', function (req, res) {
        res.send("Welcome to Bloom API. Contact irfan@adcoretechnologies.com to get access on latest api document. Environment - " + process.env.NODE_ENV);
    });

    app.get('/intro', function (req, res) {
        res.sendfile("public/intro_video.html");
    });

};