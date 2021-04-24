var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var segments = mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, 'Segment name is required']
    },
    iconUrl: String,
    bannerUrl: String,
    timestamp: Number,
    createdById: {
        type: ObjectId,
        ref: 'staffs'
    },
    updatedById: {
        type: ObjectId,
        ref: 'staffs'
    },
    isSchool: {
        type: Boolean,
        default: true
    }, //1 MEANS SCHOOL
    isActive: {
        type: Boolean,
        default: false
    }, //By default 1 means Active
    isDeleted: {
        type: Boolean,
        default: false
    } //By default 0 means Not Deleted
});
segments.plugin(timestamps);
module.exports = mongoose.model('segments', segments);