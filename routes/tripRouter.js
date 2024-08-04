let jwt = require("jsonwebtoken");
let User = require("../models/user");
let Trip = require("../models/Trip")
let File = require("../models/File");
let express = require('express');
let tripRouter = express.Router();
let dotenv = require("dotenv");
let Notification = require("../models/notification");
dotenv.config();
tripRouter.get("/",async (req,res)=>{
    let userData = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
    try {
        let trips = await Trip.find({});
        let response = [];
        for (const element of trips) {
            let {description,destination,participators,isCancelled,period,date,numberOfLikes,maxNumberOfParticipators,numberOfSaves,price,numberOfDisLikes} = element;
            let user = await User.findOne({email:userData.email});
            let isTripLiked = user.likedTrips.includes(element._id);
            let isTripDisliked = user.dislikedTrips.includes(element._id);
            let isTripSaved = user.savedTrips.includes(element._id);
            let links = [];
            let users = [];
            for (const el of element.images) {
                let file = await File.findById(el);
                links.push(file.path);
            }
            for (const p of participators) {
                let participator = await User.findById(p);
                let userAvatar = await File.findById(participator.avatar);
                users.push({
                    firstName:participator.firstName,
                    lastName:participator.lastName,
                    email:participator.email,
                    dateOfBirth:participator.dateOfBirth,
                    addedOn:participator.addedOn,
                    userAvatar:userAvatar.path
                })
            }
            let responseObject = {
                description,
                destination,
                isCancelled,
                links,
                users,
                period,
                date,
                numberOfLikes,
                numberOfDisLikes,
                price,
                maxNumberOfParticipators,
                numberOfParticipators:participators.length,
                numberOfSaves,
            }
            if(userData){
                response.push({...responseObject,id:element._id,isTripLiked,isTripSaved,isTripDisliked});
            }else{
                response.push(responseObject);
            }
        }
        let token = jwt.sign({response},process.env.SECRET_KEY)
        res.status(200).json({token});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.post("/add",async (req,res)=>{
    let {images,title,description,period,date,price} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let foundTrip = await Trip.findOne({destination:title});
        if(foundTrip){
            res.json({message:"destination already existing"});
        }else{
            let trip = new Trip();
            trip.destination = title;
            trip.description = description;
            trip.period = period;
            trip.price = Number(price);
            trip.date = Number(date);
            for (const image of images) {
                let file = await File.create({name:title,path:image});
                trip.images.push(file._id);
            }
            await trip.save();
            res.status(201).json({message:"trip added successfully"})
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.post("/participate", async (req,res)=>{
    let {date,cinNumber,numberOfPeople,period} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        if(req.cookies.jwt_token){
            let email = jwt.verify(req.cookies.jwt_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            let trip = await Trip.findOne({period,date});
            if((trip.participators.length + Number(numberOfPeople) - 1) < trip.maxNumberOfParticipators){
                trip.participators.push(user._id);
                user.plannedTrips.push(trip._id);
                await user.save();
                await trip.save();
                res.status(201).json({success_message:"congrats for participating to the trip..."});
            }else{
                res.status(201).json({failure_message:"OOPS! there are no available places for this trip"});
            }
        }else{
            res.status(401).json({error_message:"please log in to participate"})
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.put("/cancel",async (req,res)=>{
    try {
        if(req.cookies.jwt_token){
            let {email,tripId} = jwt.verify(req.body.body,process.env.SECRET_KEY);
            let user = await User.findOne({email});
            let trip = await Trip.findById(tripId);
            if(trip.participators.includes(user._id)){
                trip.participators.splice(trip.participators.indexOf(user._id),1);
                user.plannedTrips.splice(user.plannedTrips.indexOf(trip._id),1);
                await trip.save();
                await user.save();
                res.status(201).json({message:"Sorry for making you cancel the participation ):"});
            }
        }else{
            res.status(401).json({error_message:"please log in to cancel"});
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.delete("/remove/:destination",async(req,res)=>{
    let {destination} = req.params
    try {
        if(req.cookies.json_token){
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            if(user.isAdmin){
                let foundTrip = await Trip.findOneAndDelete({destination});
                res.json({message:"trip removed successfully"});
            }else{
                res.status(401).json({message:"you are not authorized to modify these chunks of data"});
            }
        }else{
            res.status(401).json({message:"you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        res.status(404).json({message:"error removing the item"})
    }
})
tripRouter.delete("/users/remove/:userEmail",async(req,res)=>{
    let {userEmail} = req.params;
    try {
        if(req.cookies.json_token){
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let adminUser = await User.findOne({email});
            if(adminUser.isAdmin){
                let user = await User.findOne({email:userEmail});
                let trips = await Trip.find({});
                let trip = trips.filter((item)=>{
                    return item.participators.includes(user._id);
                })
                trip.participators.splice(trip.participators.indexOf(user._id),1);
                await trip.save();
                res.json({message:"user removed successfully from trip"});
            }else{
                res.status(401).json({failure_message:"OOPS you are not authorized to modify these chunks of data"});
            }
        }else{
            res.status(401).json({failure_message:"OOPS you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        res.status(404).json({message:"error removing the item"})
    }
})
tripRouter.put("/react",async(req,res)=>{
    let {id,email,reaction} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let trip = await Trip.findById(id);
        let user = await User.findOne({email});
        const alreadyLiked = user.likedTrips.includes(id);
        const alreadyDisliked = user.dislikedTrips.includes(id);
        if (reaction === 'like') {
            if (alreadyLiked) {
                // User already liked, remove like
                user.likedTrips = user.likedTrips.filter(tripId => tripId.toString() !== id);
                trip.numberOfLikes--;
            } else {
                user.likedTrips.push(id);
                trip.numberOfLikes++;
                if (alreadyDisliked) {
                    // User already disliked, remove dislike
                    user.dislikedTrips = user.dislikedTrips.filter(tripId => tripId.toString() !== id.toString());
                    trip.numberOfDisLikes--;
                }
            }
        } else if (reaction === 'dislike'){
            if (alreadyDisliked){
                // User already disliked, remove dislike
                user.dislikedTrips = user.dislikedTrips.filter(tripId => tripId.toString() !== id.toString());
                trip.numberOfDisLikes--;
            } else {
                user.dislikedTrips.push(id);
                trip.numberOfDisLikes++;
                if (alreadyLiked) {
                    // User already liked, remove like
                    user.likedTrips = user.likedTrips.filter(tripId => tripId.toString() !== id.toString());
                    trip.numberOfLikes--;
                }
            }
        }
        await user.save();
        await trip.save();
        let responseObject = {
            numberOfDisLikes:trip.numberOfDisLikes,
            numberOfLikes:trip.numberOfLikes,
            isLiked:user.likedTrips.includes(trip._id),
            isDisliked:user.dislikedTrips.includes(trip._id),
        }
        let token = jwt.sign({responseObject},process.env.SECRET_KEY);
        res.json({token});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.put("/save",async(req,res)=>{
    let {id,email} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let user = await User.findOne({email});
        let trip = await Trip.findById(id);
        if(user){
            if(!user.savedTrips.includes(id)){
                user.savedTrips.push(id);
                trip.numberOfSaves++;
            }else{
                user.savedTrips.splice(user.savedTrips.indexOf(id),1);
                trip.numberOfSaves--;
            }
            await user.save();
            await trip.save();
        }
        let responseObject = {...trip,numberOfSaves:trip.numberOfSaves}
        let token = jwt.sign({responseObject},process.env.SECRET_KEY);
        res.json({token});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.get("/saved",async(req, res) => {
    try {
        if(req.cookies.json_token){
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            let savedTrips = [];
            for (const item of user.savedTrips) {
                let trip = await Trip.findById(item);
                let links = [];
                let responseObject = {
                    destination:trip.destination,
                    addedOn:trip.addedOn,
                    isCancelled:trip.isCancelled,
                    description:trip.description,
                    price:trip.price,
                    maxNumberOfParticipators:trip.maxNumberOfParticipators,
                    numberOfParticipators:trip.participators.length,
                    period:trip.period,
                    date:trip.date,
                    isCancelled:trip.isCancelled,
                    numberOfLikes:trip.numberOfLikes,
                    numberOfDisLikes:trip.numberOfDisLikes,
                    numberOfSaves:trip.numberOfSaves,
                    isDisliked:user.dislikedTrips.includes(trip._id),
                    isLiked:user.likedTrips.includes(trip._id),
                    id:trip._id
                }
                for (const el of trip.images) {
                    let imagePath = await File.findById(el); 
                    links.push(imagePath.path);
                }
                savedTrips.push({...responseObject,links});
            }
            let token = jwt.sign({savedTrips},process.env.SECRET_KEY);
            res.status(200).json({token})
        }else{
            res.status(401).json({trips:"OOPS! you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.get("/registered",async(req, res) => {
    try {
        if(req.cookies.json_token){
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            let savedTrips = [];
            let trips = await Trip.find({});
            let registeredTrips = trips.filter((item)=>{
                return item.participators.includes(user._id);
            })
            for (const item of registeredTrips) {
                let links = [];
                let responseObject = {
                    destination:item.destination,
                    addedOn:item.addedOn,
                    isCancelled:item.isCancelled,
                    price:item.price,
                    maxNumberOfParticipators:item.maxNumberOfParticipators,
                    period:item.period,
                    date:item.date,
                    isCancelled:item.isCancelled,
                    numberOfLikes:item.numberOfLikes,
                    numberOfDisLikes:item.numberOfDisLikes,
                    numberOfSaves:item.numberOfSaves,
                    isDisliked:user.dislikedTrips.includes(trip._id),
                    isLiked:user.likedTrips.includes(trip._id),
                    id:item._id
                }
                for (const el of item.images) {
                    let imagePath = await File.findById(el); 
                    links.push(imagePath.path);
                }
                savedTrips.push({...responseObject,images:links});
            }
            let token = jwt.sign({savedTrips},process.env.SECRET_KEY);
            res.status(200).json({token})
        }else{
            res.status(401).json({trips:"OOPS! you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.get("/liked",async(req, res) => {
    try {
        if(req.cookies.json_token){
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            let likedTrips = [];
            for (const item of user.likedTrips) {
                let trip = await Trip.findById(item);
                let links = [];
                let responseObject = {
                    destination:trip.destination,
                    description:trip.description,
                    isCancelled:trip.isCancelled,
                    price:trip.price,
                    maxNumberOfParticipators:trip.maxNumberOfParticipators,
                    period:trip.period,
                    date:trip.date,
                    isCancelled:trip.isCancelled,
                    numberOfLikes:trip.numberOfLikes,
                    numberOfDisLikes:trip.numberOfDisLikes,
                    numberOfSaves:trip.numberOfSaves,
                    numberOfParticipators:trip.participators.length,
                    isDisliked:user.dislikedTrips.includes(trip._id),
                    isLiked:user.likedTrips.includes(trip._id),
                    id:trip._id
                }
                for (const el of trip.images) {
                    let imagePath = await File.findById(el); 
                    links.push(imagePath.path);
                }
                likedTrips.push({...responseObject,links});
            }
            let token = jwt.sign({likedTrips},process.env.SECRET_KEY);
            res.status(200).json({token})
        }else{
            res.status(401).json({trips:"OOPS! you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.get("/disliked",async(req, res) => {
    try {
        if(req.cookies.json_token){
            let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            let user = await User.findOne({email});
            let dislikedTrips = [];
            for (const item of user.dislikedTrips) {
                let trip = await Trip.findById(item);
                let links = [];
                let responseObject = {
                    destination:trip.destination,
                    description:trip.description,
                    isCancelled:trip.isCancelled,
                    price:trip.price,
                    maxNumberOfParticipators:trip.maxNumberOfParticipators,
                    period:trip.period,
                    date:trip.date,
                    isCancelled:trip.isCancelled,
                    numberOfLikes:trip.numberOfLikes,
                    numberOfDisLikes:trip.numberOfDisLikes,
                    numberOfSaves:trip.numberOfSaves,
                    numberOfParticipators:trip.participators.length,
                    isDisliked:user.dislikedTrips.includes(trip._id),
                    isLiked:user.likedTrips.includes(trip._id),
                    id:trip._id
                }
                for (const el of trip.images) {
                    let imagePath = await File.findById(el); 
                    links.push(imagePath.path);
                }
                dislikedTrips.push({...responseObject,links});
            }
            let token = jwt.sign({dislikedTrips},process.env.SECRET_KEY);
            res.status(200).json({token})
        }else{
            res.status(401).json({trips:"OOPS! you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
module.exports = tripRouter;