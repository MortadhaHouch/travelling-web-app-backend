let {Schema,model} = require("mongoose");
let feedbackSchema = new Schema({
    sender:{
        type:Schema.Types.ObjectId,
        required:true
    },
    content:{
        type:String,
        required:true
    },
    numberOfLikes:{
        type:Number,
        required:true,
        default:0
    },
    isLiked:{
        type:Boolean,
        default:false,
        required:true
    }
})
module.exports = model("Feedback",feedbackSchema);