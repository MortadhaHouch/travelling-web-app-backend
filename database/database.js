let mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require('mongodb');
let dotenv = require("dotenv");
dotenv.config();
const uri = process.env.MONGODB_URI;
let client =new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        await client.connect();
        await client.db("traveling-web-app").command({ ping: 1 });
        mongoose.connect(uri).then((client)=>{
            client = client
            console.log("mongoose connected");
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
        })
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
module.exports = client;