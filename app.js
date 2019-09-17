// Before you run this app, ake sure the recommendation engine (another service written in python, Django) is up. 
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    session     = require("express-session")
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    Product  = require("./models/product"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    seedDB      = require("./seeds"),
    request = require("request");



/*  -----------------------------------------------------------------
1-DATABASE 
*/
var url = process.env.DATABASEURL || "mongodb://localhost:27017/farm"; 
mongoose.connect(url, {useNewUrlParser: true});
// seedDB();



/* -----------------------------------------------------------------
2-PASSPORT CONFIGURATION 
*/
app.use(session({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(passport.initialize());
app.use(passport.session());



/* -----------------------------------------------------------------
3-ROUTE
*/
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(flash());
// global variables
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.Product = Product;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});

// why here? "error is not defined in landings.ejs"
//requiring routes
var commentRoutes    = require("./routes/comments"),
    productRoutes = require("./routes/products"),
    indexRoutes      = require("./routes/index");
app.use("/", indexRoutes);
app.use("/products", productRoutes); 
app.use("/products/:id/comments", commentRoutes);



/* -----------------------------------------------------------------
4-Schedule Tasks Periodically.
log in the recommendation server with superuser credentials:
*/
var url = "http://127.0.0.1:8000/login"
var requestData = {
   "username": "konglin",
   "password": "Easy_0094"
 };
request({
      url: url,
      method: "POST",
      json: requestData,
   },
   function (error, resp, body){
      if(error) {console.log(error);}
      else {
         console.log("logged in Recommendation System.");
         console.log(body["token"]);
      }
});
// update recommender daily
// pre-compute all recommendations for all customers and store on the database
var schedule = require('node-schedule'); 
var rule = new schedule.RecurrenceRule();
rule.hour = 0;
var ACCESS_KEY = "Token c6f02775276bdcdac8320482013f21589f2cd737";
schedule.scheduleJob(rule, function(){
   // train the model
   console.log('Routine: train recommendations form recommendation engine...');
   request({
      url: "http://127.0.0.1:8000/train",
      method: "POST",
      headers: {'Authorization': ACCESS_KEY}
   },function (error, resp, body){
      if(error) {
         console.log(error);
      }
      else {
         console.log("model was retrained...");
         // pull recommendations for each user from recommendation engine. 
         console.log('Routine: pulling recommendations form recommendation engine...');
         User.find({}, function(err, allUsers){
            if(err){
               console.log(err);
            } else {
               allUsers.forEach(function(user){
                  //clear staled recommendations in DB, so as to avoid duplications. ;
                  User.updateOne({_id: user._id}, {$set: {"recommendations": []}}, function(err, affected){
                     if(err)
                        console.log(err);
                     else
                        // console.log('affected: ', affected);
                        request({
                           url: "http://127.0.0.1:8000/query",
                           method: "POST",
                           json: {"uid" : user._id, "n_rec": 10},
                           headers: {'Authorization': ACCESS_KEY}
                        },function (error, resp, body){
                           if(error) {
                              console.log(error);
                           }
                           else {
                              console.log("new recommendations successfully pulled from recommendation server!");
                              console.log("users_to_recommend are: "+ body["users_to_recommend"]);
                              console.log("recommendations are: "+ body["recom"]);
                              body["recom"].forEach(function(recommendation){
                                 user.recommendations.push(recommendation);
                              }); 
                              user.save();
                              console.log("new recommendations sucessfully pushed to local DB -- end");
                           }
                        });
                  });
               });
            }
         });
      }
   });
});
// User.findOne({_id: user._id}).populate("recommendations").exec(function(err, user){
//    if(err) {console.log(err);}
//    else {console.log(user);}
// });
// or do online query in the views.  
// problem: cold start?


app.listen(process.env.PORT || 8082, function(){
   console.log("The YelpCamp Server Has Started at port 8082!");
});