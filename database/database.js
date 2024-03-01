let mongoose = require("mongoose");
let dotenv = require("dotenv");
dotenv.config();
const uri = process.env.MONGODB_URI;
let client;
async function run() {
    try {
        client = await mongoose.connect(uri)
        console.log("connected to db");
    } catch(err) {
        console.log(err);
    }
}
run().catch(console.dir);
module.exports = client;