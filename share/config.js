var U = require('./util.api');
var request = require('request');
var Q = require('q');

module.exports = {

    getConnection: function (pool) {
        var deferred = Q.defer();
        pool.getConnection(function (err, con) {
            if (!err)
                deferred.resolve(con);
            else deferred.reject(err);
        });
        return deferred.promise;
    }
}
