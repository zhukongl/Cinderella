var mongoose = require("mongoose");

var productSchema = new mongoose.Schema({
   name: String,
   image: String,
   price: String,
   description: String,
   author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String
   },
   comments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Comment"
      }
   ],
   recommendations: [
      {
          type: mongoose.Schema.Types.ObjectId,
          ref:  "Product"
      }
  ]
});

module.exports = mongoose.model("Product", productSchema);