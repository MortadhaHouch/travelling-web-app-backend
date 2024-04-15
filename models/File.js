let {Schema,model} = require("mongoose")
let destinationSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    path:{
        type:String,
        required:true
    }
})
module.exports = model("file",destinationSchema);