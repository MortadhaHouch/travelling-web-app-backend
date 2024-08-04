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
    numberOfDislikes:{
        type:Number,
        required:true,
        default:0
    },
    isVisibleByOthers:{
        type:Boolean,
        default:true,
        required:true
    },
    addedOn:{
        default:Date.now().toString(),
        type:String,
        required:true
    },
    responses:{
        type:[Schema.Types.ObjectId],
        default:[],
        required:true,
    }
})
module.exports = model("Feedback",feedbackSchema);