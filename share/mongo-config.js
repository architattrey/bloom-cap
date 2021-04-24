module.exports = function () {
    switch (process.env.NODE_ENV) {
        case 'development':
            return {
                "url": 'mongodb://blommAdmin1:devpass123@ec2-35-154-220-146.ap-south-1.compute.amazonaws.com:27017/bloom_dev'
            };

        case 'staging':
            return {
                "url": 'mongodb://blommAdmin1:passworddd123@35.154.97.165:27017/bloom_p'
            };
        case 'production':
            return {
                "url": 'mongodb://bloomAppUser:oxAynL3XDJ6awWWs@bloom-production-shard-00-00-1bjyl.mongodb.net:27017,bloom-production-shard-00-01-1bjyl.mongodb.net:27017,bloom-production-shard-00-02-1bjyl.mongodb.net:27017/bloom_p?ssl=true&replicaSet=bloom-production-shard-0&authSource=admin'
            };

        default:
            return {
                // "url": 'mongodb://bloomDevUser:PQd8VQELEIpBEk3T@bloom-dev-shard-00-00-gauko.mongodb.net:27017,bloom-dev-shard-00-01-gauko.mongodb.net:27017,bloom-dev-shard-00-02-gauko.mongodb.net:27017/bloom_dev?replicaSet=Bloom-Dev-shard-0&ssl=true&authSource=admin'
                "url": 'mongodb://bloomAppUser:oxAynL3XDJ6awWWs@bloom-production-shard-00-00-1bjyl.mongodb.net:27017,bloom-production-shard-00-01-1bjyl.mongodb.net:27017,bloom-production-shard-00-02-1bjyl.mongodb.net:27017/bloom_p?ssl=true&replicaSet=bloom-production-shard-0&authSource=admin'
            };
    }
};

// db.auth('geeksAdmin', 'gee@mon71')
// use bloom_dev
// db.createUser(
//  {
//    user: "blommAdmin1",
//    pwd: "devpass123",
//    roles: [ { role: "readWrite", db: "bloom_dev" } ]
//   }
// )

// db.createUser(
//     {
//         user: "bloomDev",
//         pwd: "devpass123",
//         roles: [{ role: "readWrite", db: "bloom_dev" }]
//     }
// )