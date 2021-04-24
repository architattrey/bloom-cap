var express = require('express');
var router = express.Router();


require('./api/users.api')(app);
/* GET home page. */
router.get('/', function(req, res, next) {
 res.send("Welcome to onBazar api. For access, please contact system admin :-"+ process.env.NODE_ENV);
});

module.exports = router;
