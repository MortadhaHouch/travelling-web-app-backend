let dotenv = require('dotenv');
dotenv.config();
let {model,Schema} = require("mongoose");
let commentSchema = new Schema({
    from:{
        type:Schema.Types.ObjectId,
        required:true
    },
    to:{
        type:Schema.Types.ObjectId,
        required:true
    },
    isForFeedback:{
        type:Boolean,
        default:true
    },
    forPost:{
        type:Schema.Types.ObjectId,
        required:true
    },
    content:{
        type:String,
        required:true
    },
    addedOn:{
        type:String,
        required:true,
        default:Date.now().toString(),
        immutable:true
    },
    lastModified:{
        type:String,
        required:true,
        default:Date.now().toString()
    }
});
module.exports = model("comments",commentSchema)