var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    purchases: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:  "Product"
        }
    ],
    recommendations: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:  "Product"
        }
    ]
});

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", UserSchema);