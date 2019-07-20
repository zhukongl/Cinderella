// PredictionIO: using Similar-Product-Engine-Template

var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    Product  = require("./models/product"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    seedDB      = require("./seeds")
    request = require("request")
    
//requiring routes
var commentRoutes    = require("./routes/comments"),
    productRoutes = require("./routes/products"),
    indexRoutes      = require("./routes/index")

// console.log(process.env.DATABASEURL);    
var url = process.env.DATABASEURL || "mongodb://localhost:27017/farm"; // MONGODB_URI
mongoose.connect(url, {useNewUrlParser: true});

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
// seedDB(); //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.Product = Product;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});

// why here? "error is not defined in landings.ejs"
app.use("/", indexRoutes);
app.use("/products", productRoutes); 
app.use("/products/:id/comments", commentRoutes);

// update recommender daily
var schedule = require('node-schedule'); 
var rule = new schedule.RecurrenceRule();
rule.hour = 4;

// log in the recommendation server with superuser credentials:
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
         // console.log(body["token"]);
      }
});

// pre-compute all recommendations for all customers and store on the database
var j = schedule.scheduleJob(rule, function(){
   console.log('pulling recommendations form PredictionIO server...');
   Product.find({}, function(err, allProducts){
      if(err){
         console.log(err);
      } else {
         var ACCESS_KEY = 'gfvFFfYxV14cp5gzmhSBwxmAj9FykLEzTfSw4jRVpph4_eRQS8SkFWtGjZidpCRi';
         var url = 'http://localhost:8000/queries.json';
         allProducts.forEach(function(product){
            //clear staled recommendations in DB, so as to avoid duplications. ;
            Product.updateOne({_id: product._id}, {$set: {"recommendations": []}}, function(err, affected){
               if(err)
                  console.log(err);
               else
                  console.log('affected: ', affected);
                  var requestData = {
                     "items": [product._id], //product._id
                     "num": 4
                  };
                  request({
                     url: url,
                     method: "POST",
                     json: requestData
                  },function (error, resp, body){
                     if(error) {
                        console.log(error);
                     }
                     else {
                        console.log("new recommendations successfully pulled from recommendation server!");
                        // console.log(body);
                        // store into db
                        body.itemScores.forEach(function(recommendation){
                           product.recommendations.push(recommendation.item);
                        }); 
                        product.save();
                        console.log("new recommendations sucessfully pushed to local DB -- end");
                        // console.log(product.recommendations);
                     }
                  });
            });
         });
      }
   });
});
// or do online query in the views.  
// problem: cold start?


app.listen(process.env.PORT || 8082, function(){
   console.log("The YelpCamp Server Has Started at port 8082!");
});