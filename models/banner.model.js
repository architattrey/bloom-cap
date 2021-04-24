var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var bannerSchema = mongoose.Schema({
    bannerImageUrl: {
        type: String
    },
    caption: {
        type: String,
    },
    entityType: {
        type: String,
    },
    entityId: {
        type: String,
    },
    order: {
        type: Number,
    },
    bannerClickUrl: {
        type: String
    },
    timestamp: {
        type: Number
    },
    isActive: {
        type: Boolean,
        default: true
    }, //By default true means Active
    isDeleted: {
        type: Boolean,
        default: false
    }
});
bannerSchema.plugin(timestamps);
module.exports = mongoose.model('banner', bannerSchema);