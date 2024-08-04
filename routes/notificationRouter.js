let jwt = require("jsonwebtoken");
let User = require("../models/user");
let File = require("../models/File");
let Feedback = require("../models/Feedback");
let Faq = require("../models/Faq");
let express = require("express");
let Notification = require("../models/notification");
let notificationRouter = express.Router();
let dotenv = require("dotenv");
dotenv.config();
notificationRouter.get("/",async(req,res)=>{
    try {
        if(req.cookies.json_token){
            let itemsPerRequest = 10;
            let requestIndex = Number(req.query.p) || 0;
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            let myNotifications = await Notification.find({to:{$in:[user._id]}});
            let limitedNotifications = await Notification.find({
                to:{$in:[user._id]}
            }).limit(itemsPerRequest).skip(requestIndex*itemsPerRequest);
            let unseenNotifications = await Notification.find({to:{$in:[user._id]},isSeen:false});
            let notificationsArray = [];
            for (const item of limitedNotifications){
                let fromUser = await User.findById(item.from);
                let userAvatar = await File.findById(fromUser.avatar);
                let responsesObject = {
                    content:item.content,
                    addedOn:item.addedOn,
                    from:item.from,
                    firstName:fromUser.firstName,
                    lastName:fromUser.lastName,
                    userId:fromUser._id,
                    userEmail:fromUser.email,
                    userAvatar:userAvatar.path,
                    isPinned:item.isPinned,
                    isPrivate:fromUser.isPrivate,
                    isSeen:item.isSeen,
                    isMyProfile:fromUser._id.toString() == user._id.toString(),
                    id:item._id
                }
                notificationsArray.push(responsesObject);
                item.isSeen = true;
                await item.save();
            }
            let token = jwt.sign({
                myNotifications:notificationsArray,
                numberOfNotifications:myNotifications.length,
                unseenNotifications:unseenNotifications.length,
                numberOfPages:Math.ceil(myNotifications.length/itemsPerRequest),
            },process.env.SECRET_KEY);
            res.status(200).json({token});
        }else{
            res.status(200).json({error:"error"});
        }
    } catch (error) {
        console.log(error);
    }
})
notificationRouter.put("/pin",async(req,res)=>{
    let {email,pin} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let user = await User.findOne({email});
        if(user){
            let notification = await Notification.findById(pin);
            notification.isPinned = !notification.isPinned;
            await notification.save();
            let token = jwt.sign({isPinned:notification.isPinned},process.env.SECRET_KEY);
            res.status(200).json({token});
        }else{
            res.status(401).json({error:"error"});
        }
    } catch (error) {
        console.log(error);
    }
})
module.exports = notificationRouter