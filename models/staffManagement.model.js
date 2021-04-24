var timestamps = require('mongoose-timestamp');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var roles = new Schema({
    roleName: String,
    accessRights: [{ screenName: String, read: Boolean, update: Boolean, delete: Boolean }]
});
var staffs = mongoose.Schema({

    timestamp: Number,
    fullName: String,
    mobile: { type: Number },
    email: {
        type: String,
        validate: {
            validator: function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: '{VALUE} is not a valid email.Please provide correct email !'
        },
        required: [true, 'Email id missing !'],
        unique: true
    },
    designation: { type: String, default: '' },
    password: String,
    staffId: { type: String },
    lastLogin: { type: Number, default: 0 },
    resetPasswordLink: { type: String, default: '' },
    resetPasswordRequestedOn: Number,
    passwordChangedOn: Number,
    roles: roles,
    updatedBy:String,
    isActive: {
        type: Number,
        default: 1
    },//By default 1 means Active
    isDeleted: {
        type: Number,
        default: 0
    },//By default 0 means Not Deleted
    isBlock: {
        type: Number,
        default: 0
    }//By default 0 means Not block
});

staffs.plugin(timestamps);
module.exports = mongoose.model('staffs', staffs);