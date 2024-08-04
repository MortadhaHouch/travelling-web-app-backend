let {Schema,model} = require("mongoose")
let notificationSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    to:{
        type:[Schema.Types.ObjectId],
        required:true,
    },
    from:{
        type:Schema.Types.ObjectId,
        required:true,
    },
    addedOn:{
        type:String,
        default:Number(Date.now().toString()),
        required:true,
    },
    content:{
        type:String,
        required:true,
    },
    isSeen:{
        type:Boolean,
        default:false
    },
    isPinned:{
        type:Boolean,
        default:false
    }
})
module.exports = model("notifications",notificationSchema);