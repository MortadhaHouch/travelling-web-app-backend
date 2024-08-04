let express = require('express');
let jwt = require("jsonwebtoken");
let User = require("../models/user");
let File = require("../models/File");
let Feedback = require("../models/Feedback")
let Faq = require("../models/Faq");
let faqRouter = express.Router();
let dotenv = require("dotenv");
let Notification = require("../models/notification");
dotenv.config();
faqRouter.get("/",async(req,res)=>{
    try {
        let email;
        let user;
        if(req.cookies.json_token){
            email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            user = await User.findOne({email});
        }
        let faqs=[];
        let itemsPerRequest = 10;
        let requestIndex = req.query.p || 0;
        let foundFaqs = await Faq.find({isVisibleByOthers:true});
        if(user && user.isAdmin){
            foundFaqs = await Faq.find({}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        }else if(user && !user.isAdmin){
            foundFaqs = await Faq.find({isVisibleByOthers:true}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        }
        for (const item of foundFaqs){
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
                isLoggedIn:sender.isLoggedIn,
                isLiked:user.likedFaqs.includes(item._id),
                isDisliked:user.dislikedFaqs.includes(item._id),
            };
            if(req.cookies.json_token){
                faqs.push({...responseObject,id:item._id,faqIsMine:item.sender.toString() === user._id.toString()});
            }else{
                faqs.push(responseObject);
            }
        }
        let token = jwt.sign({
            faqs,
            faqsCount:faqs.length,
            numberOfPages:Math.floor(faqs.length/itemsPerRequest) == 0 ? 1 : Math.floor(faqs.length/itemsPerRequest)
        },process.env.SECRET_KEY);
        res.status(200).json({token});
    } catch (error) {
        console.log(error);
        res.status(404).json({error:"Error 404"})
    }
})
faqRouter.put("/react",async(req,res)=>{
    let {id,email,reaction} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let user = await User.findOne({email});
        if(user){
            let faq = await Faq.findById(id);
            const alreadyLiked = user.likedFaqs.includes(id);
            const alreadyDisliked = user.dislikedFaqs.includes(id);
            let faqOwner = await User.findById(faq.sender);
            let notification = new Notification();
            notification.from = user._id;
            notification.to = faq.sender;
            if (reaction === 'like') {
                if (alreadyLiked) {
                    // User already liked, remove like
                    user.likedFaqs = user.likedFaqs.filter(faqId => faqId.toString() !== id.toString());
                    faq.numberOfLikes--;
                    notification.title = "faq rate removal";
                    notification.content = `${faqOwner._id.toString() === user._id.toString()?"you have removed your rate from you faq":faqOwner.firstName+" "+faqOwner.lastName+" has removed his rate from your faq"}`;
                } else {
                    user.likedFaqs.push(id);
                    faq.numberOfLikes++;
                    notification.title = "faq like";
                    notification.content = `${faqOwner._id.toString() === user._id.toString()?"you have liked your faq":faqOwner.firstName+" "+faqOwner.lastName+" has liked your faq"}`;
                    if (alreadyDisliked) {
                        // User already disliked, remove dislike
                        user.dislikedFaqs = user.dislikedFaqs.filter(faqId => faqId.toString() !== id.toString());
                        faq.numberOfDislikes--;
                        notification.title = "faq like";
                        notification.content = `${faqOwner._id.toString() === user._id.toString()?"you have changed your rate about your faq":faqOwner.firstName+" "+faqOwner.lastName+" has changed his rate about your faq"}`;
                    }
                }
            } else if (reaction === 'dislike') {
                if (alreadyDisliked) {
                    // User already disliked, remove dislike
                    user.dislikedFaqs = user.dislikedFaqs.filter(faqId => faqId.toString() !== id.toString());
                    faq.numberOfDislikes--;
                    notification.title = "faq rate removal";
                    notification.content = `${faqOwner._id.toString() === user._id.toString()?"you have removed your rate from you faq":faqOwner.firstName+" "+faqOwner.lastName+" has removed his rate from your faq"}`;
                } else {
                    user.dislikedFaqs.push(id);
                    faq.numberOfDislikes++;
                    notification.title = "faq rate removal";
                    notification.content = `${faqOwner._id.toString() === user._id.toString()?"you have disliked your faq":faqOwner.firstName+" "+faqOwner.lastName+" has disliked your faq"}`;
                    if (alreadyLiked) {
                        // User already liked, remove like
                        user.likedFaqs = user.likedFaqs.filter(faqId => faqId.toString() !== id.toString());
                        faq.numberOfLikes--;
                        notification.title = "faq dislike";
                        notification.content = `${faqOwner._id.toString() === user._id.toString()?"you have changed your rate about your faq":faqOwner.firstName+" "+faqOwner.lastName+" has changed his rate about your faq"}`;
                    }
                }
            }
            let responseObject = {
                numberOfDislikes:faq.numberOfDislikes,
                numberOfLikes:faq.numberOfLikes,
                isLiked:user.likedFaqs.includes(faq._id),
                isDisliked:user.dislikedFaqs.includes(faq._id)
            }
            await notification.save();
            await user.save();
            await faq.save();
            let token = jwt.sign({responseObject},process.env.SECRET_KEY);
            res.json({token});
        }
    } catch (error) {
        console.log(error);
    }
})
faqRouter.post("/add",async(req,res)=>{
    let {email,faq} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let user = await User.findOne({email});
        let newFaq = await Faq.create({sender:user._id,content:faq});
        res.status(201).json({message:jwt.sign({message:"Faq added"},process.env.SECRET_KEY)})
    } catch (error) {
        console.log(error);
    }
})
faqRouter.get("/posted",async(req, res) => {
    try {
        if(req.cookies.json_token){
            let {email} = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
            let user = await User.findOne({email});
            let faqs = await Faq.find({sender:user._id});
            let response=[];
            for (const item of faqs){
                let userAvatar = await File.findById(user.avatar)
                let responseObject = {
                    userAvatar:userAvatar.path,
                    content:item.content,
                    userFirstName:user.firstName,
                    userLastName:user.lastName,
                    userEmail:user.email,
                    numberOfLikes:item.numberOfLikes,
                    numberOfDislikes:item.numberOfDislikes,
                    numberOfComments:item.responses.length,
                    addedOn:item.addedOn,
                    id:item._id,
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
module.exports = faqRouter;