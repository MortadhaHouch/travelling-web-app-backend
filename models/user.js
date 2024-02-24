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
        default:false,
    },
})
User.pre("save",async function(){
    try {
        let salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        console.log(error);
    }
})
User.methods.checkIsAdmin = function(){
    fs.readFile("./admin.json",async(err,data)=>{
        if(err){
            console.log(err);
        }else{
            let {email,password} = JSON.parse(data.toString());
            // console.log(email,password);
            try {
                let passwordCheck = await bcrypt.compare(password,this.password);
                if(this.email == email && passwordCheck){
                    this.isAdmin = true;
                }else{
                    this.isAdmin = false;
                }
                await this.save();
                return this;
            } catch (error) {
                console.log(error.message);
            }
        }
    })
}
module.exports = model("users",User);