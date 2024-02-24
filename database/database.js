let mongoose = require("mongoose");
let dotenv = require("dotenv");
dotenv.config();
let client;
mongoose.connect(process.env.MONGODB_URI).then((client)=>{
    client = client;
    console.log("connected to DB");
}).catch((error)=>{
    console.log("error connecting");
})
module.exports = client;