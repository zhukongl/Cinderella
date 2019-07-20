var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var request = require("request");

//root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
   res.render("register"); 
});

//handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
            // get data from form and add to products array
            var uid = user._id;
            var requestData = {
                "event" : "$set",
                "entityType" : "user",
                "entityId" : uid,
                "eventTime" : Date.now
            };
            // send new user creation event to event server.
            //step-2: data collection: send data to event server at localhost: 7070;
            var ACCESS_KEY = 'Gvmip2Qs_q9lnmxexBAhNkrn_6JyMrgufsHsfEXneB2-RjRicJmDPUYvad0-qGnC';
            var url = 'http://ec2-18-188-79-185.us-east-2.compute.amazonaws.com:7070/events.json?accessKey='+ACCESS_KEY;
            request({
                url: url,
                method: "POST",
                json: requestData
            },function (error, resp, body){
                if(error) {
                    console.log(error);
                }
                else {
                    console.log("new user successfully post to event server!");
                }
            });
           req.flash("success", "Welcome to YelpCamp " + user.username);
           res.redirect("/products"); 
        });
    });
});

//show login form
router.get("/login", function(req, res){
   res.render("login"); 
});

//handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/products",
        failureRedirect: "/login",
        // badRequestMessage : 'Missing username or password.',
        failureFlash : true
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("/products");
});



module.exports = router;