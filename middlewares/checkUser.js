let user = require("../models/user");
let jwt = require("jsonwebtoken");
let dotenv = require("dotenv");
dotenv.config();
async function checkUser(req,res,next){
    try {
        if(!req.cookies.json_token){
            res.redirect("/user/login");
        }else{
            let userData = jwt.verify((req.body.json_token || req.cookies.json_token),process.env.SECRET_KEY);
            let foundUser = await user.findOne({email:userData.email});
            let userName = `${foundUser.firstName}_${foundUser.lastName}`;
            // res.status(200).json({user:foundUser,userName})
            console.log({foundUser,userName});
        }
        next()
    } catch (error){
        console.log(error);
    }
}
module.exports = checkUser