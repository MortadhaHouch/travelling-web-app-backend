let {Schema,model} = require("mongoose")
let destinationSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    path:{
        type:String,
        required:true
    },
    isFavorite:{
        type:Boolean,
        required:true,
        default:false
    },
    numberOfLikes:{
        type:Number,
        required:true,
        default:0
    },
    tag:{
        type:String,
        required:true
    }
})
module.exports = model("file",destinationSchema);