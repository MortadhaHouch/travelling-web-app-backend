let express = require('express');
let commentsRouter = express.Router();
let Comment = require("../models/Comment");
let User = require("../models/user");
let Feedback = require("../models/Feedback");
let Faq = require("../models/Faq");
let jwt = require("jsonwebtoken")
let File = require("../models/File");
let Notification = require("../models/notification");
commentsRouter.get("/feedback/:id",async(req,res)=>{
    let {id} = req.params;
    try {
        let comments = await Comment.find({isForFeedback:true});
        let feedback = await Feedback.findById(id);
        let commentsFound = comments.filter((item)=>{
            return feedback.responses.includes(item._id);
        })
        let response = [];
        for (const item of commentsFound) {
            let commentSender = await User.findById(item.from);
            let commentReceiver = await User.findById(item.to);
            let senderAvatar = await File.findById(commentSender.avatar);
            let receiverAvatar = await File.findById(commentReceiver.avatar);
            let responseObject = {
                senderEmail:commentSender.email,
                senderName:`${commentSender.firstName} ${commentSender.lastName}`,
                senderAvatar:senderAvatar.path,
                receiverAvatar:receiverAvatar.path,
                receiverEmail:commentReceiver.email,
                receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
                senderIsLoggedIn:commentSender.isLoggedIn,
                receiverIsLoggedIn:commentReceiver.isLoggedIn,
                content:item.content,
                addedOn:item.addedOn,
                id:item._id
            }
            response.push(responseObject);
        }
        let token = jwt.sign({response},process.env.SECRET_KEY);
        res.status(200).json({token});
    } catch (error){
        console.log(error);
    }
})
commentsRouter.post("/feedback/add",async(req,res)=>{
    let {content,from,to,id} = jwt.verify(req.body.body, process.env.SECRET_KEY);
    try {
        let commentSender = await User.findOne({email:from});
        let commentReceiver = await User.findOne({email:to});
        let feedback = await Feedback.findById(id);
        let senderAvatar = await File.findById(commentSender.avatar);
        let receiverAvatar = await File.findById(commentReceiver.avatar);
        let addedComment = await Comment.create({from:commentSender._id,to:commentReceiver._id,isForFeedback:true,forPost:feedback._id,content});
        let notification = await Notification.create({
            from:commentSender,
            to:commentReceiver,
            content:`${commentSender._id.toString() === commentReceiver._id.toString()?"you":commentSender.firstName+" "+commentSender.lastName} has made a comment to your feedback`,
            title:"new comment added"
        })
        let responseObject = {
            senderEmail:commentSender.email,
            senderName:`${commentSender.firstName} ${commentSender.lastName}`,
            senderAvatar:senderAvatar.path,
            receiverAvatar:receiverAvatar.path,
            receiverEmail:commentReceiver.email,
            receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
            content:addedComment.content,
            addedOn:addedComment.addedOn,
            senderIsLoggedIn:commentSender.isLoggedIn,
            receiverIsLoggedIn:commentReceiver.isLoggedIn,
            id:addedComment._id,
        }
        feedback.responses.push(addedComment._id);
        await feedback.save();
        let token = jwt.sign({responseObject},process.env.SECRET_KEY);
        res.status(200).json({token});
    } catch (error) {
        console.log(error);
    }
})
commentsRouter.get("/faq/:id",async(req,res)=>{
    let {id} = req.params;
    try {
        let comments = await Comment.find({isForFeedback:false});
        let faq = await Faq.findById(id);
        let commentsFound = comments.filter((item)=>{
            return faq.responses.includes(item._id);
        })
        let response = [];
        for (const item of commentsFound) {
            let commentSender = await User.findById(item.from);
            let commentReceiver = await User.findById(item.to);
            let senderAvatar = await File.findById(commentSender.avatar);
            let receiverAvatar = await File.findById(commentReceiver.avatar);
            let responseObject = {
                senderEmail:commentSender.email,
                senderName:`${commentSender.firstName} ${commentSender.lastName}`,
                senderAvatar:senderAvatar.path,
                senderIsLoggedIn:commentSender.isLoggedIn,
                receiverIsLoggedIn:commentReceiver.isLoggedIn,
                receiverAvatar:receiverAvatar.path,
                receiverEmail:commentReceiver.email,
                receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
                senderIsLoggedIn:commentSender.isLoggedIn,
                receiverIsLoggedIn:commentReceiver.isLoggedIn,
                content:item.content,
                addedOn:item.addedOn,
                id:item._id
            }
            response.push(responseObject);
        }
        let token = jwt.sign({response},process.env.SECRET_KEY);
        res.status(200).json({token});
    } catch (error){
        console.log(error);
    }
})
commentsRouter.post("/faq/add",async(req,res)=>{
    let {content,from,to,id} = jwt.verify(req.body.body, process.env.SECRET_KEY);
    try {
        let commentSender = await User.findOne({email:from});
        let commentReceiver = await User.findOne({email:to});
        let faq = await Faq.findById(id);
        let senderAvatar = await File.findById(commentSender.avatar);
        let receiverAvatar = await File.findById(commentReceiver.avatar);
        let addedComment = await Comment.create({from:commentSender._id,to:commentReceiver._id,isForFeedback:false,forPost:faq._id,content});
        let notification = await Notification.create({
            from:commentSender,
            to:commentReceiver,
            content:`${commentSender.firstName} ${commentSender.lastName} has made a comment to your faq`,
            title:"new faq added"
        })
        let responseObject = {
            senderEmail:commentSender.email,
            senderName:`${commentSender.firstName} ${commentSender.lastName}`,
            senderAvatar:senderAvatar.path,
            receiverAvatar:receiverAvatar.path,
            receiverEmail:commentReceiver.email,
            receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
            content:addedComment.content,
            addedOn:addedComment.addedOn,
            senderIsLoggedIn:commentSender.isLoggedIn,
            receiverIsLoggedIn:commentReceiver.isLoggedIn,
            id:addedComment._id
        }
        faq.responses.push(addedComment._id);
        await faq.save();
        let token = jwt.sign({responseObject}, process.env.SECRET_KEY);
        res.status(200).json({token});
    } catch (error) {
        console.log(error);
    }
})
commentsRouter.delete("/feedback/remove/:id",async(req,res)=>{
    let {id} = req.params;
    try {
        let foundComment = await Comment.findById(id);
        let feedbacks = await Feedback.find({});
        let feedback = feedbacks.find((item)=>item.responses.includes(foundComment._id));
        feedback.responses.splice(feedback.responses.indexOf(foundComment[0]),1);
        Comment.findByIdAndDelete(id);
        await feedback.save();
        let comments = [];
        for (const item of feedback.responses){
            let comment = await Comment.findById(item);
            let commentSender = await User.findById(comment.from);
            let commentReceiver = await User.findById(comment.to);
            let content = comment.content;
            let senderAvatar = await File.findById(commentSender.avatar);
            let receiverAvatar = await File.findById(commentReceiver.avatar);
            let responseObject = {
                senderEmail:commentSender.email,
                senderName:`${commentSender.firstName} ${commentSender.lastName}`,
                senderAvatar:senderAvatar.path,
                receiverAvatar:receiverAvatar.path,
                receiverEmail:commentReceiver.email,
                receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
                addedOn:comment.addedOn,
                senderIsLoggedIn:commentSender.isLoggedIn,
                receiverIsLoggedIn:commentReceiver.isLoggedIn,
                id:comment._id,
                content,
            }
            comments.push(responseObject);
        }
        let token = jwt.sign({comments},process.env.SECRET_KEY);
        res.status(200).json({token})
    } catch (error) {
        console.log(error);
    }
})
commentsRouter.delete("/faq/remove/:id",async(req,res)=>{
    let {id} = req.params;
    try {
        let foundComment = await Comment.findById(id);
        let faqs = await Faq.find({});
        let faq = faqs.find((item)=>item.responses.includes(foundComment._id));
        faq.responses.splice(faq.responses.indexOf(foundComment[0]),1);
        Comment.findByIdAndDelete(id);
        await faq.save();
        let comments = [];
        for (const item of faq.responses){
            let comment = await Comment.findById(item);
            let commentSender = await User.findById(comment.from);
            let commentReceiver = await User.findById(comment.to);
            let content = comment.content;
            let senderAvatar = await File.findById(commentSender.avatar);
            let receiverAvatar = await File.findById(commentReceiver.avatar);
            let responseObject = {
                senderEmail:commentSender.email,
                senderName:`${commentSender.firstName} ${commentSender.lastName}`,
                senderAvatar:senderAvatar.path,
                receiverAvatar:receiverAvatar.path,
                receiverEmail:commentReceiver.email,
                receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
                senderIsLoggedIn:commentSender.isLoggedIn,
                receiverIsLoggedIn:commentReceiver.isLoggedIn,
                addedOn:comment.addedOn,
                id:comment._id,
                content,
            }
            comments.push(responseObject);
        }
        let token = jwt.sign({comments},process.env.SECRET_KEY);
        res.status(200).json({token})
    } catch (error) {
        console.log(error);
    }
})
commentsRouter.put("/edit",async(req,res)=>{
    let {content,from,to,id} = jwt.verify(req.body.body, process.env.SECRET_KEY);
    try {
        let foundComment = await Comment.findById(id);
        let commentSender = await User.findOne({email: from});
        let commentReceiver = await User.findOne({email: to});
        let senderAvatar = await File.findById(commentSender);
        let receiverAvatar = await File.findById(commentReceiver);
        let notification = await Notification.create({
            from:commentSender,
            to:commentReceiver,
            content:`${commentSender.firstName} ${commentSender.lastName} has modified his comment`,
            title:"comment update"
        })
        let responseObject = {
            senderEmail:commentSender.email,
            senderName:`${commentSender.firstName} ${commentSender.lastName}`,
            senderAvatar:senderAvatar.path,
            receiverAvatar:receiverAvatar.path,
            receiverEmail:commentReceiver.email,
            receiverName:`${commentReceiver.firstName} ${commentReceiver.lastName}`,
            content:foundComment.content,
            addedOn:foundComment.addedOn,
            senderIsLoggedIn:commentSender.isLoggedIn,
            receiverIsLoggedIn:commentReceiver.isLoggedIn,
            id:foundComment._id
        }
        foundComment.content = content;
        foundComment.lastModified = Date.now().toString();
        let token = jwt.sign({responseObject});
        res.status(200).json({token});
        await foundComment.save();
    } catch (error) {
        console.log(error);
    }
})
module.exports = commentsRouter;