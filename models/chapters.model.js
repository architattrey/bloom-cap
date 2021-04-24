var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var chapters = mongoose.Schema({
    name: String,
    iconUrl: { type: String, default: "" },
    segments: [{ type: ObjectId, ref: 'segments' }],
    subSegments: [{ type: ObjectId, ref: 'subSegments' }],
    units: [{ type: ObjectId, ref: 'units' }],
    subject: { type: ObjectId, ref: 'subjects' },
    timestamp: { type: Number },
    bannerUrl: {
        type: String,
        default: ''
    },
    cratedById: { type: ObjectId, ref: 'users' },
    updatedBy: { type: ObjectId, ref: 'users' },
    isActive: { type: Boolean, default: false },//By default 1 means Active
    isDeleted: { type: Boolean, default: false }//By default 1 means Not Deleted
});
chapters.plugin(timestamps);
module.exports = mongoose.model('chapters', chapters);