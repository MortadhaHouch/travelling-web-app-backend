let {Schema,model} = require("mongoose");
let trip = new Schema({
    destination:{
        type:String,
        required:true
    },
    participators:{
        type:[Schema.Types.ObjectId],
        required:true
    },
    isCancelled:{
        type:Boolean,
        required:true,
        default:false
    }
})
module.exports = model("trip",trip)