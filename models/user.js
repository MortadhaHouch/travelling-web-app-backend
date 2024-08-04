let {model,Schema} = require("mongoose");
let bcrypt = require("bcrypt");
let dotenv = require("dotenv");
let client = require("../database/database");
let fs = require("fs")
dotenv.config();
let User = new Schema({
    firstName:{
        type:String,
        required:true,
        lowercase:true
    },
    lastName:{
        type:String,
        required:true,
        lowercase:true
    },
    isMale:{
        type:Boolean,
        required:true
    },
    avatar:{
        type:Schema.Types.ObjectId,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true
    },
    isAdmin:{
        type:Boolean,
        required:true,
        default:false,
        immutable:true
    },
    dateOfBirth:{
        type:String,
        required:true
    },
    likedTrips:{
        type:[Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    dislikedTrips:{
        type:[Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    savedTrips:{
        type: [Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    plannedTrips:{
        type: [Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    likedFeedbacks:{
        type:[Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    dislikedFeedbacks:{
        type:[Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    savedFeedbacks:{
        type: [Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    likedFaqs:{
        type:[Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    dislikedFaqs:{
        type:[Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    savedFaqs:{
        type: [Schema.Types.ObjectId],
        required:true,
        default:[]
    },
    addedOn:{
        default:Date.now().toString(),
        type:String,
        required:true
    },
    isLoggedIn:{
        type:Boolean,
        required:true,
        default:false
    },
    currentLoginIpAddress:{
        type:String,
        required:true,
        default:""
    },
    isPrivate:{
        type:Boolean,
        required:true,
        default:false
    }
})
User.pre("save", async function(next){
    try {
        const isAdminEmail = (this.email === process.env.EMAIL);
        this.isAdmin = isAdminEmail;
        if (!this.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        next();
    } catch (error) {
        console.error('Error while saving user:', error.message);
        next(error);
    }
});
module.exports = model("users",User);