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
        required:true,
    },
    isAdmin:{
        type:Boolean,
        required:true,
        default:false
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
    plannedTrips:{
        type: [Schema.Types.ObjectId],
        required:true,
        default:[]
    }
})
User.pre("save",async function(){
    try {
        let {EMAIL,PASSWORD} = process.env;
        if(this.email == EMAIL && this.password == PASSWORD){
            this.isAdmin = true;
        }else{
            this.isAdmin = false;
        }
        let salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        console.log(error);
    }
})
module.exports = model("users",User);