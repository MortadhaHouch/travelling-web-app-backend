let jwt = require("jsonwebtoken");
let User = require("../models/user");
let File = require("../models/File");
let Feedback = require("../models/Feedback");
let express = require("express");
let feedbackRouter = express.Router();
let dotenv = require("dotenv");
let Notification = require("../models/notification");
dotenv.config();
feedbackRouter.get("/",async(req,res)=>{
    try {
        let email;
        let user;
        if(req.cookies.json_token){
            email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            user = await User.findOne({email});
        }
        let feedbacks=[];
        let itemsPerRequest = 10;
        let requestIndex = Number(req.query.p) || 0;
        let foundFeedbacks = await Feedback.find({isVisibleByOthers:true});
        if(user && user.isAdmin){
            foundFeedbacks = await Feedback.find({}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        }else if(user && !user.isAdmin){
            foundFeedbacks = await Feedback.find({isVisibleByOthers:true}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        }
        for (const item of foundFeedbacks){
            let sender = await User.findById(item.sender);
            let senderAvatar = await File.findOne(sender.avatar);
            let responseObject = {
                numberOfDislikes:item.numberOfDislikes,
                numberOfLikes:item.numberOfLikes,
                content:item.content,
                userAvatar:senderAvatar.path,
                userFirstName:sender.firstName,
                userLastName:sender.lastName,
                userEmail:sender.email,
                isVisibleByOthers:item.isVisibleByOthers,
                numberOfComments:item.responses.length,
                addedOn:item.addedOn,
                isLiked:user.likedFeedbacks.includes(item._id),
                isDisliked:user.dislikedFeedbacks.includes(item._id),
                isLoggedIn:user.isLoggedIn,
            };
            if(req.cookies.json_token){
                feedbacks.push({...responseObject,id:item._id,feedbackIsMine:item.sender.toString() === user._id.toString()});
            }else{
                feedbacks.push(responseObject);
            }
        }
        let token = jwt.sign({
            feedbacks,
            feedbacksCount:feedbacks.length,
            numberOfPages:Math.ceil(feedbacks.length/itemsPerRequest)
        },process.env.SECRET_KEY);
        res.status(200).json({response:token});
    } catch (error) {
        console.log(error);
        res.status(404).json({error:"Error 404"})
    }
})
feedbackRouter.post("/add",async(req,res)=>{
    let {email,feedback} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    console.log(email,feedback);
    try {
        let user = await User.findOne({email});
        let newFeedback = await Feedback.create({sender:user._id,content:feedback});
        res.status(201).json({message:jwt.sign({message:"Feedback added"},process.env.SECRET_KEY)})
    } catch (error) {
        console.log(error);
    }
})
feedbackRouter.put("/react",async(req,res)=>{
    let {id,email,reaction} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let user = await User.findOne({email});
        if(user){
            let feedback = await Feedback.findById(id);
            const alreadyLiked = user.likedFeedbacks.includes(id);
            const alreadyDisliked = user.dislikedFeedbacks.includes(id);
            let feedbackOwner = await User.findById(feedback.sender);
            let notification = new Notification();
            notification.from = user._id;
            notification.to = feedback.sender;
            if (reaction === 'like') {
                if (alreadyLiked) {
                    // User already liked, remove like
                    user.likedFeedbacks = user.likedFeedbacks.filter(feedbackId => feedbackId.toString() !== id);
                    feedback.numberOfLikes--;
                    notification.title = "feedback dislike";
                    notification.content = `${feedbackOwner._id.toString() === user._id.toString()?"you have disliked your feedback":feedbackOwner.firstName+" "+feedbackOwner.lastName+" has disliked your feedback"}`;
                } else {
                    user.likedFeedbacks.push(id);
                    feedback.numberOfLikes++;
                    notification.title = "feedback like";
                    notification.content = `${feedbackOwner._id.toString() === user._id.toString()?"you have liked your feedback":feedbackOwner.firstName+" "+feedbackOwner.lastName+" has liked your feedback"}`;
                    if (alreadyDisliked) {
                        // User already disliked, remove dislike
                        user.dislikedFeedbacks = user.dislikedFeedbacks.filter(feedbackId => feedbackId.toString() !== id.toString());
                        feedback.numberOfDislikes--;
                        notification.title = "feedback like";
                        notification.content = `${feedbackOwner._id.toString() === user._id.toString()?"you have changed your rate about your feedback":feedbackOwner.firstName+" "+feedbackOwner.lastName+" has changed his rate about your feedback"}`;
                    }
                }
            } else if (reaction === 'dislike') {
                if (alreadyDisliked) {
                    // User already disliked, remove dislike
                    user.dislikedFeedbacks = user.dislikedFeedbacks.filter(feedbackId => feedbackId.toString() !== id.toString());
                    feedback.numberOfDislikes--;
                    notification.title = "feedback rate removal";
                    notification.content = `${feedbackOwner._id.toString() === user._id.toString()?"you have removed your rate from you feedback":feedbackOwner.firstName+" "+feedbackOwner.lastName+" has removed his rate from your feedback"}`;
                } else {
                    user.dislikedFeedbacks.push(id);
                    feedback.numberOfDislikes++;
                    notification.title = "feedback rate removal";
                    notification.content = `${feedbackOwner._id.toString() === user._id.toString()?"you have removed your rate from you feedback":feedbackOwner.firstName+" "+feedbackOwner.lastName+" has removed his rate from your feedback"}`;
                    if (alreadyLiked) {
                        // User already liked, remove like
                        user.likedFeedbacks = user.likedFeedbacks.filter(feedbackId => feedbackId.toString() !== id.toString());
                        feedback.numberOfLikes--;
                        notification.title = "feedback dislike";
                        notification.content = `${feedbackOwner._id.toString() === user._id.toString()?"you have changed your rate about your feedback":feedbackOwner.firstName+" "+feedbackOwner.lastName+" has changed his rate about your feedback"}`;
                    }
                }
            }
            let responseObject = {
                numberOfDislikes:feedback.numberOfDislikes,
                numberOfLikes:feedback.numberOfLikes,
                isLiked:user.likedFeedbacks.includes(feedback._id),
                isDisliked:user.dislikedFeedbacks.includes(feedback._id),
            }
            await user.save();
            await feedback.save();
            await notification.save();
            let token = jwt.sign({responseObject},process.env.SECRET_KEY);
            res.json({token});
        }
    } catch (error) {
        console.log(error);
    }
})
feedbackRouter.get("/posted",async(req, res) => {
    try {
        if(req.cookies.json_token){
            let {email} = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
            let user = await User.findOne({email});
            let feedbacks = await Feedback.find({sender:user._id});
            let response=[];
            for (const item of feedbacks){
                let userAvatar = await File.findById(user.avatar)
                let responseObject = {
                    userAvatar:userAvatar.path,
                    userFirstName:user.firstName,
                    userLastName:user.lastName,
                    userEmail:user.email,
                    content:item.content,
                    numberOfDislikes:item.numberOfDislikes,
                    numberOfLikes:item.numberOfLikes,
                    numberOfComments:item.responses.length,
                    id:item._id,
                    addedOn:item.addedOn,
                    isVisibleByOthers:item.isVisibleByOthers
                }
                response.push(responseObject);
            }
            let token = jwt.sign({response},process.env.SECRET_KEY);
            res.status(200).json({token})
        }else{
            res.status(401).json({failure_message:"you are not allowed to see these chunks of data"});
        }
    
    } catch (error) {
        console.log(error);
    }
})
module.exports = feedbackRouter;