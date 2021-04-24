var express = require('express');
var path = require('path');
var cors = require('cors');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var Config = require('./share/mongo-config');
conf = new Config();

mongoose.Promise = global.Promise;
// mongoose.connect();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.use('/', express.static(__dirname + '/'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json

app.use(express.static(path.join(__dirname, '/public')));
app.set('view engine', 'ejs'); // set up ejs for templating

app.use(cors());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
require('./routes')(app);

mongoose.connect(conf.url)
    .then(() => { // if all is ok we will be here
        var port = process.env.PORT || 5060;
        if (process.env.NODE_ENV == 'production')
            port = 5070;
        app.listen(port);
        console.log("App listening on port " + port + " with environment : " + process.env.NODE_ENV);
    })
    .catch(err => { // if error we will be here
        console.error('App starting error:', err.stack);
        process.exit(1);
    });



module.exports = app;

// Run production env - NODE_ENV=production nodemon
