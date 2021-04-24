var timestamp = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var enquirySchema = mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String,
    },
    message: {
        type: String,
    },
    timestamp: {
        type: Number
    },
    mobile: String,
    isActive: {
        type: Boolean,
        default: true
    }, //By default true means Active
    isDeleted: {
        type: Boolean,
        default: false
    }
});
enquirySchema.plugin(timestamp);
module.exports = mongoose.model('enquiry', enquirySchema);