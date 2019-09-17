var express = require("express");
var router  = express.Router();
var Product = require("../models/product");
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");

var ACCESS_KEY = "Token c6f02775276bdcdac8320482013f21589f2cd737"

// INDEX - show all products
router.get("/", function(req, res){
    // Get all products from DB
    Product.find({}, function(err, allProducts){
       if(err){
           console.log(err);
       } else {
          res.render("products/index",{products:allProducts});
       }
    });
});

// CREATE - add new product to DB
router.post("/", middleware.isLoggedIn, function(req, res){
    // get data from form and add to products array
    var name = req.body.name;
    var image = req.body.image;
    var price = req.body.price;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    // Create a new product and save to local DB
    var newProduct = {name: name, image: image, price: price, description: desc, author:author}
    Product.create(newProduct, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to products page
            console.log("new product created!");
            res.redirect("/products");
        }
    });
});

//Buy - user buy a product.
router.post("/:uid/:iid", middleware.isLoggedIn, function(req, res){
    // get data from form and add to products array
    var uid = req.params.uid;
    var iid = req.params.iid;  // string
    var requestData = {
        "event" : "view",
        "entityType" : "user",
        "uid" : uid,
        "targetEntityType" : "item",
        "pid" : iid,
        "eventTime" : Date.now
      };
    User.findById(uid, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/products/show", {product: iid});
        } else {
            console.log(type(iid))
            user.purchases.push(iid);
            user.save();
            req.flash("success", "Successfully added to cart");
            res.redirect('/products/profile/');
        }
    });

    //step-2: send transaction data to recommender engine at localhost: 7070;
    var url = "http://127.0.0.1:8000/newtransaction"
    request({
        url: url,
        method: "POST",
        json: requestData,
        headers: {'Authorization': ACCESS_KEY}

    },function (error, resp, body){
        if(error) {
            console.log(error);
        }
        else {
            console.log(body["state"]);
        }
    });

    // //step-3: test: get data from RecSys Database server
    // request(url, { json: true }, function (error, response, body) {
    //     if(error) {
    //         console.log('error:', error); // Print the error if one occurred
    //     }
    //     else {
    //         console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    //         console.log('body:', body); // Print the HTML for the Google homepage.
    //     }
    // });

    // //step-4: redirect some where and flash
    // req.flash("success", "redirected to /products");
    // res.redirect("/products");
});

// show user profile
router.get("/profile", middleware.isLoggedIn, function(req, res){
    // Get all purchases and recommendation from current users DB
    // currentUseris global
    User.findById(req.user._id).populate("purchases").populate("recommendations").exec(function(err, foundUser){
        if(err){
            console.log(err);
        } else {
            // req.flash("success", "your profile");
            res.render("products/profile", {foundUser: foundUser});
        }
    });
});


// NEW - show form to create new product
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("products/new"); 
});

// SHOW - shows more info about one product
router.get("/:id", middleware.isLoggedIn, function(req, res){
    //find the products with provided ID
    Product.findById(req.params.id).populate("comments").populate("recommendations").exec(function(err, foundProduct){
        if(err){
            console.log(err);
        } else {

            // console.log(foundProduct);
            //render show template with that product
            // 1. pull recommendation from server or local DB (need to be update daily)
            // 2. update show view: resmmendation to fill new-show
            res.render("products/show", {product: foundProduct});
        }
    });
});

// EDIT PRODUCT ROUTE
router.get("/:id/edit", middleware.checkProductOwnership, function(req, res){
    Product.findById(req.params.id, function(err, foundProduct){
        res.render("products/edit", {product: foundProduct});
    });
});

// UPDATE PRODUCT ROUTE
router.put("/:id",middleware.checkProductOwnership, function(req, res){
    // find and update the correct product
    Product.findByIdAndUpdate(req.params.id, req.body.product, function(err, updatedProduct){
       if(err){
           res.redirect("/products");
       } else {
           //redirect somewhere(show page)
           res.redirect("/products/" + req.params.id);
       }
    });
});

// DESTROY PRODUCT ROUTE
router.delete("/:id",middleware.checkProductOwnership, function(req, res){
   Product.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/products");
      } else {
          res.redirect("/products");
      }
   });
});


module.exports = router;