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