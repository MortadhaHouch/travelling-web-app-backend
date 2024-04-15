let {Schema,model} = require("mongoose");
let faqSchema = new Schema({
    content:{
        type:String,
        required:true
    },
    responses:{
        type:[Schema.Types.ObjectId],
        default:[],
        required:true,
    },
    sender:{
        type:Schema.Types.ObjectId,
        required:true
    }
})
module.exports = model("Faq",faqSchema)