let express = require('express');
let jwt = require("jsonwebtoken");
let bcrypt = require("bcrypt");
let User = require("../models/user");
let File = require("../models/File");
let Notification = require("../models/notification");
let dotenv = require("dotenv");
let requestIP = require("request-ip")
dotenv.config();
let userRouter = express.Router();
userRouter.post("/login",async (req,res)=>{
    let {email,password} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let foundUser = await User.findOne({email});
        if(foundUser){
            try {
                let foundPassword = await bcrypt.compare(password,foundUser.password);
                if(foundUser.isLoggedIn){
                    if(foundUser.currentLoginIpAddress === requestIP.getClientIp(req)){
                        let maxAge=60*60*24*3;
                        let file = await File.findById(foundUser.avatar);
                        let token = jwt.sign({
                            email,
                            password,
                            isAdmin:foundUser.isAdmin,
                            firstName:foundUser.firstName,
                            lastName:foundUser.lastName,
                            avatar:file.path
                        },process.env.SECRET_KEY,{expiresIn:maxAge});
                        foundUser.isLoggedIn = true;
                        foundUser.currentLoginIpAddress = requestIP.getClientIp(req);
                        await foundUser.save();
                        console.log("you are logged in from another browser");
                        res.status(200).json({token});
                    }else{
                        let token = jwt.sign({security_error:"A login attempt from another device has occurred"},process.env.SECRET_KEY);
                        res.json({token});
                    }
                }else{
                    if(foundUser.currentLoginIpAddress == requestIP.getClientIp(req)){
                        let maxAge=60*60*24*3;
                        let file = await File.findById(foundUser.avatar);
                        let token = jwt.sign({
                            email,
                            password,
                            isAdmin:foundUser.isAdmin,
                            firstName:foundUser.firstName,
                            lastName:foundUser.lastName,
                            avatar:file.path
                        },process.env.SECRET_KEY,{expiresIn:maxAge});
                        foundUser.isLoggedIn = true;
                        foundUser.currentLoginIpAddress = requestIP.getClientIp(req);
                        await foundUser.save();
                        console.log("you are logged in from another browser");
                        res.status(200).json({token});
                    }else{
                        let token = jwt.sign({security_error:"A login attempt from another device has occurred"},process.env.SECRET_KEY);
                        res.json({token});
                    }
                }
            } catch (err) {
                let maxAge=60*60*24*3;
                let token = jwt.sign({password_error:"please verify your password"},process.env.SECRET_KEY,{expiresIn:maxAge});
                res.status(200).json({token});
            }
        }else{
            let maxAge=60*60*24*3;
            let token = jwt.sign({email_error:"OOPS!! user with this email is not existing"},process.env.SECRET_KEY,{expiresIn:maxAge});
            res.status(404).json({token});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.post("/login/success",async(req,res)=>{
    let {success_message} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        if(success_message){
            let token = jwt.sign({success_message:"success"},process.env.SECRET_KEY);
            res.status(200).json({token});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.post("/login/failure",async(req,res)=>{
    let {error_message} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        if(error_message){
            let token = jwt.sign({error_message:"error"},process.env.SECRET_KEY);
            res.status(400).json({token});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.post("/login/check_email",async(req,res)=>{
    try {
        let {email} = jwt.verify(req.body.body,process.env.SECRET_KEY);
        let user = await User.findOne({email});
        if(user){
            let token = jwt.sign({success:"user is existing"},process.env.SECRET_KEY);
            res.status(200).json({token});
        }else{
            let token = jwt.sign({error:"user not found"},process.env.SECRET_KEY);
            res.status(200).json({token});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.post("/login/check_password",async(req,res)=>{
    let {email,password,newPassword} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let user = await User.findOne({email});
        if(user){
            try {
                let isPasswordValid = await bcrypt.compare(password,user.password);
                if(isPasswordValid){
                    let maxAge=60*60*24*3;
                    let file = await File.findById(user.avatar);
                    let token = jwt.sign({
                        email,
                        password,
                        isAdmin:user.isAdmin,
                        firstName:user.firstName,
                        lastName:user.lastName,
                        avatar:file.path,
                        isPasswordValid
                    },process.env.SECRET_KEY,{expiresIn:maxAge});
                    user.isLoggedIn = true;
                    user.password = newPassword;
                    user.currentLoginIpAddress = requestIP.getClientIp(req);
                    await user.save();
                    res.status(200).json({token});
                }else{
                    let token = jwt.sign({isPasswordValid},process.env.SECRET_KEY);
                    res.json({token});
                }
            } catch (error) {
                let token = jwt.sign({isPasswordValid:"password is not valid"},process.env.SECRET_KEY);
                res.json({token});
            }
        }else{
            res.status(404).json({error:"User not found"})
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/signup",(req,res)=>{
    res.redirect("/user/signup")
})
userRouter.post("/signup",async (req,res)=>{
    let {body} = req.body;
    let {firstName,lastName,email,password,age,isMale,avatar} = jwt.verify(body,process.env.SECRET_KEY);
    try {
        let userFoundByEmail = await User.findOne({email});
        if(userFoundByEmail){
            res.json({token:jwt.sign({email_existence_error:"user with this email is already existing"},process.env.SECRET_KEY)});
        }else{
            if(userFoundByEmail?.firstName == firstName){
                let token = jwt.sign({
                    firstName_existence_error:"user with this name is already existing"
                },process.env.SECRET_KEY);
                res.json({token});
            }else{
                let file = await File.create({path:avatar,name:firstName});
                let user = await User.create({firstName,lastName,email,password,dateOfBirth:age,isMale,avatar:file._id,isLoggedIn:true,currentLoginIpAddress:requestIP.getClientIp(req)});
                let maxAge=60*60*24*3;
                let token = jwt.sign({
                    email,
                    password,
                    avatar:file.path,
                    isAdmin:user.isAdmin,
                    firstName:user.firstName,
                    lastName:user.lastName
                },process.env.SECRET_KEY,{expiresIn:maxAge});
                if(user.isAdmin){
                    let notification = await Notification.create({
                        to:user._id,
                        from:user._id,
                        title:"new signup",
                        content:"A new user has been created successfully"
                    })
                }else{
                    let notification = await Notification.create({
                        to:user._id,
                        from:user._id,
                        title:"new signup",
                        content:"Welcome to our prestigious traveling agency ,we hope you will have a great time with us."
                    })
                }
                res.status(201).json({token});
            }
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/users",async (req,res)=>{
    try {
        if(req.cookies.json_token){
            let userData = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
            let foundUser = await User.findOne({email:userData.email});
            if(foundUser.isAdmin){
                let users = await User.find({isAdmin:false});
                let response = [];
                for (const element of users) {
                    let {firstName,lastName,email,dateOfBirth,addedOn,avatar,isMale,isLoggedIn} = element;
                    let userAvatar = await File.findById(avatar);
                    response.push({firstName,lastName,email,dateOfBirth,addedOn,isMale,userAvatar:userAvatar.path,isLoggedIn});
                }
                let token = jwt.sign({response},process.env.SECRET_KEY);
                res.status(200).json({token});
            }else{
                res.status(401).json({response_error:"you are not authorized to see these chunks of data"});
            }
        }else{
            res.status(401).json({response_error:"you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/users/:id",async(req,res)=>{
    let {id} = req.params;
    try {
        if(req.cookies.json_token){
            let {email} = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
            let user = await User.findOne({email});
            let requestedUser = await User.findById(id);
            if(user.isAdmin){
                let userAvatar = await File.findById(requestedUser.avatar);
                let responseObject = {
                    firstName:requestedUser.firstName,
                    lastName:requestedUser.lastName,
                    email:requestedUser.email,
                    dateOfBirth:requestedUser.dateOfBirth,
                    addedOn:requestedUser.addedOn,
                    isMale:requestedUser.isMale,
                    userAvatar:userAvatar.path,
                    isLoggedIn:requestedUser.isLoggedIn
                }
                let token = jwt.sign({responseObject},process.env.SECRET_KEY);
                res.status(200).json({token});
            }else{
                if(requestedUser.isPrivate){
                    let token = jwt.sign({message:"this account is private"},process.env.SECRET_KEY);
                    res.status(200).json({token});
                }else{
                    let {firstName,lastName,email,dateOfBirth,addedOn,avatar,isMale,isLoggedIn} = requestedUser;
                    let userAvatar = await File.findById(avatar);
                    let responseObject = {
                        firstName:requestedUser.firstName,
                        lastName:requestedUser.lastName,
                        email:requestedUser.email,
                        dateOfBirth:requestedUser.dateOfBirth,
                        addedOn:requestedUser.addedOn,
                        isMale:requestedUser.isMale,
                        userAvatar:userAvatar.path,
                        isLoggedIn:requestedUser.isLoggedIn
                    }
                    let token = jwt.sign({responseObject},process.env.SECRET_KEY);
                    res.status(200).json({token});
                }
            }
        }else{
            res.status(401).json({response_error:"you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/profile",async(req,res)=>{
    try {
        if(req.cookies.json_token){
            let {email} = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
            let user = await User.findOne({email});
            let userAvatar = await File.findById(user.avatar);
            let responseObject = {
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                dateOfBirth:user.dateOfBirth,
                addedOn:user.addedOn,
                isMale:user.isMale,
                userAvatar:userAvatar.path,
                isLoggedIn:user.isLoggedIn,
                isMyProfile:true
            }
            let token = jwt.sign({responseObject},process.env.SECRET_KEY);
            res.status(200).json({token});
        }else{
            res.status(401).json({response_error:"you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.put("/profile/update",async(req,res)=>{
    let {firstName,lastName,password,avatar,email} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let user = await User.findOne({email});
        let userAvatar = await File.findById(user.avatar);
        if(user){
            if(firstName){
                user.firstName = firstName;
            }
            if(lastName){
                user.lastName = lastName;
            }
            if(password){
                user.password = password;
            }
            if(avatar){
                userAvatar.path = avatar;
            }
            await userAvatar.save();
            await user.save();
            let token = jwt.sign({
                message:"your data is successfully updated",
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                path:userAvatar.path,
            },process.env.SECRET_KEY);
            res.status(200).json({token})
        }else{
            let token = jwt.sign({error:"please check your email address"},process.env.SECRET_KEY);
            res.status(404).json({token})
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.delete("/users/:email",async (req,res)=>{
    try {
        let userData = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
        let foundUser = await User.findOne({email:userData.email});
        if(foundUser.isAdmin){
            await User.findOneAndDelete({email:req.params.email});
            let users = await User.find({});
            res.status(200).json({response:users})
        }else{
            res.status(401).json({response_error:"OOPS!! failed deleting the user"});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.post("/logout",async(req,res)=>{
    try {
        let email = jwt.verify(req.body.body,process.env.SECRET_KEY).email;
        let user = await User.findOne({email});
        user.isLoggedIn = false;
        await user.save();
        res.json({success: "logged out"})
    } catch (error) {
        console.log(error);
    }
})
module.exports = userRouter