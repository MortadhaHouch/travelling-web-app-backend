let express  = require("express");
let app = express();
let dotenv = require("dotenv");
let bodyParser = require("body-parser");
let checkUser = require("./middlewares/checkUser");
let jwt = require("jsonwebtoken");
let bcrypt = require("bcrypt");
let cors = require("cors")
let User = require("./models/user");
let Trip = require("./models/Trip")
let userRouter = express.Router();
let tripRouter = express.Router();
let feedbackRouter = express.Router();
let faqRouter = express.Router();
let cookieParser = require("cookie-parser")
let helmet = require("helmet");
let File = require("./models/File");
let Feedback = require("./models/Feedback")
let Faq = require("./models/Faq");
dotenv.config();
app.use(express.json({limit:"10mb"}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json({limit:"10mb"}))
app.use(cors({
    origin:"http://localhost:5173",
    methods:["GET","POST","PUT","DELETE","OPTIONS"],
    credentials:true
}))
app.use(cookieParser())
app.use(helmet())
app.use("/user",userRouter);
app.use("/trips",tripRouter);
app.use("/feedbacks",feedbackRouter);
app.use("/faqs",faqRouter);
app.listen(3000,()=>{
    console.log("server running on port 3000");
})
userRouter.post("/login",async (req,res)=>{
    let {body} = req.body;
    let {email,password} = jwt.verify(body,process.env.SECRET_KEY);
    try {
        let foundUser = await User.findOne({email});
        if(foundUser){
            let foundPassword = await bcrypt.compare(password,foundUser.password);
            if(foundPassword){
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
                await foundUser.save();
                res.status(200).json({token});
            }else{
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
userRouter.get("/signup",(req,res)=>{
    res.redirect("/user/signup")
})
userRouter.post("/signup",async (req,res)=>{
    let {body} = req.body;
    let {firstName,lastName,email,password,age,isMale,avatar} = jwt.verify(body,process.env.SECRET_KEY);
    console.log(firstName,lastName,email,password,age,isMale);
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
                let user = await User.create({firstName,lastName,email,password,dateOfBirth:age,isMale,avatar:file._id,isLoggedIn:true});
                let maxAge=60*60*24*3;
                let token = jwt.sign({
                    email,
                    password,
                    avatar:file.path,
                    isAdmin:user.isAdmin,
                    firstName:user.firstName,
                    lastName:user.lastName
                },process.env.SECRET_KEY,{expiresIn:maxAge});
                res.status(201).json({token});
            }
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/users",checkUser,async (req,res)=>{
    try {
        if(req.cookies.json_token){
            let userData = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
            let foundUser = await User.findOne({email:userData.email});
            if(foundUser.isAdmin){
                let users = await User.find({isAdmin:false}).sort();
                let response = [];
                for (const element of users) {
                    let {firstName,lastName,email,dateOfBirth,addedOn,avatar,isMale} = element;
                    let userAvatar = await File.findById(avatar);
                    response.push({firstName,lastName,email,dateOfBirth,addedOn,isMale,userAvatar:userAvatar.path,isLoggedIn:element.isLoggedIn});
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
userRouter.delete("/users/:email",checkUser,async (req,res)=>{
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
tripRouter.get("/",async (req,res)=>{
    let userData = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
    try {
        let trips = await Trip.find({});
        let response = [];
        for (const element of trips) {
            let {description,destination,participators,isCancelled,period,date,numberOfLikes,maxNumberOfParticipators,numberOfSaves} = element;
            let user = await User.findOne({email:userData.email});
            let isTripLiked = user.likedTrips.includes(element._id);
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
                description,destination,isCancelled,links,users,period,date,numberOfLikes,maxNumberOfParticipators,numberOfParticipators:participators.length,numberOfSaves
            }
            if(userData){
                response.push({...responseObject,id:element._id,isTripLiked,isTripSaved});
            }else{
                response.push(responseObject);
            }
        }
        res.status(200).json({response});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.post("/add",checkUser,async (req,res)=>{
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
tripRouter.post("/participate",checkUser,async (req,res)=>{
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
tripRouter.put("/cancel",checkUser,async (req,res)=>{
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
tripRouter.delete("/remove/:destination",checkUser,async(req,res)=>{
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
tripRouter.delete("/users/remove/:userEmail",checkUser,async(req,res)=>{
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
    let {id,email} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let trip = await Trip.findById(id);
        let user = await User.findOne({email});
        if(user){
            if(!user.likedTrips.includes(id)){
                trip.numberOfLikes++;
                user.likedTrips.push(id);
            }else{
                trip.numberOfLikes--;
                user.likedTrips.splice(user.likedTrips.indexOf(id),1);
            }
            await user.save();
            await trip.save();
        }
        let token = jwt.sign({trip},process.env.SECRET_KEY);
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
        res.json({message:"trip successfully saved"})
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
                    price:item.price,
                    maxNumberOfParticipators:item.maxNumberOfParticipators,
                    period:item.period,
                    date:item.date,
                    isCancelled:item.isCancelled,
                    numberOfLikes:item.numberOfLikes,
                    numberOfDisLikes:item.numberOfDisLikes,
                    numberOfSaves:item.numberOfSaves,
                    id:item._id
                }
                for (const el of trip.images) {
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
                    addedOn:trip.addedOn,
                    isCancelled:trip.isCancelled,
                    price:item.price,
                    maxNumberOfParticipators:item.maxNumberOfParticipators,
                    period:item.period,
                    date:item.date,
                    isCancelled:item.isCancelled,
                    numberOfLikes:item.numberOfLikes,
                    numberOfDisLikes:item.numberOfDisLikes,
                    numberOfSaves:item.numberOfSaves,
                    isLiked:true,
                    id:item._id
                }
                for (const el of trip.images) {
                    let imagePath = await File.findById(el); 
                    links.push(imagePath.path);
                }
                likedTrips.push({...responseObject,images:links});
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
            for (const item of user.dislikedTrips){
                let trip = await Trip.findById(item);
                let links = [];
                let responseObject = {
                    destination:trip.destination,
                    addedOn:trip.addedOn,
                    isCancelled:trip.isCancelled,
                    price:item.price,
                    maxNumberOfParticipators:item.maxNumberOfParticipators,
                    period:item.period,
                    date:item.date,
                    isCancelled:item.isCancelled,
                    numberOfLikes:item.numberOfLikes,
                    numberOfDisLikes:item.numberOfDisLikes,
                    numberOfSaves:item.numberOfSaves,
                    isDisliked:true,
                    id:item._id
                }
                for (const el of trip.images) {
                    let imagePath = await File.findById(el); 
                    links.push(imagePath.path);
                }
                dislikedTrips.push({...responseObject,images:links});
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
        let requestIndex = req.query.p || 0;
        let foundFeedbacks = await Feedback.find({isVisibleByOthers:true});
        if(user && user.isAdmin){
            foundFeedbacks = await Feedback.find({}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        }else if(user && !user.isAdmin){
            foundFeedbacks = await Feedback.find({isVisibleByOthers:true}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        }
        for (const item of foundFeedbacks){
            let sender = await User.findById(item.sender);
            let senderAvatar = await File.findById(sender.avatar);
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
                addedOn:item.addedOn
            };
            if(req.cookies.json_token){
                feedbacks.push({...responseObject,id:item._id,feedbackIsMine:item.sender === user._id});
            }else{
                feedbacks.push(responseObject);
            }
        }
        let token = jwt.sign({
            feedbacks,
            feedbacksCount:feedbacks.length,
            numberOfPages:Math.floor(feedbacks.length/itemsPerRequest) == 0 ? 1 : Math.floor(feedbacks.length/itemsPerRequest)
        },process.env.SECRET_KEY);
        res.status(200).json({response:token});
    } catch (error) {
        console.log(error);
        res.status(404).json({error:"Error 404"})
    }
})
feedbackRouter.post("/add",checkUser,async(req,res)=>{
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
            if(reaction==="like"){
                if(user.likedTrips.includes(id)){
                    feedback.numberOfLikes--;
                    user.likedTrips.splice(user.likedTrips.indexOf(id),1);
                }else{
                    feedback.numberOfLikes++;
                    user.likedTrips.push(id);
                }
                if(user.dislikedTrips.includes(id)){
                    user.dislikedTrips.splice(user.dislikedTrips.indexOf(id),1);
                    feedback.numberOfDislikes--;
                    feedback.numberOfLikes++;
                    user.likedTrips.push(id);
                }else{
                    user.likedTrips.splice(user.likedTrips.indexOf(id),1);
                    feedback.numberOfDislikes++;
                    feedback.numberOfLikes--;
                    user.dislikedTrips.push(id);
                }
            }else{
                if(user.dislikedTrips.includes(id)){
                    feedback.numberOfDislikes--;
                    user.dislikedTrips.splice(user.dislikedTrips.indexOf(id),1);
                }else{
                    feedback.numberOfDislikes++;
                    user.dislikedTrips.push(id);
                }
                if(user.likedTrips.includes(id)){
                    user.likedTrips.splice(user.likedTrips.indexOf(id),1);
                    feedback.numberOfDislikes++;
                    feedback.numberOfLikes--;
                    user.dislikedTrips.push(id);
                }else{
                    user.dislikedTrips.splice(user.dislikedTrips.indexOf(id),1);
                    feedback.numberOfDislikes--;
                    feedback.numberOfLikes++;
                    user.likedTrips.push(id);
                }
            }
            await user.save();
            await feedback.save();
            let token = jwt.sign({feedback},process.env.SECRET_KEY);
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
                    avatar:userAvatar.path,
                    userFirstName:user.firstName,
                    userLastName:user.lastName,
                    userEmail:user.email,
                    content:item.content,
                    numberOfDisLikes:item.numberOfDislikes,
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
faqRouter.get("/",async(req,res)=>{
    try {
        let faqs = await Faq.find({});
        let itemsPerRequest = 10;
        let requestIndex = req.query.p || 0;
        let faqsFound = await Faq.find({}).skip( itemsPerRequest*requestIndex ).limit( itemsPerRequest );
        let response=[];
        for (const item of faqsFound) {
            let sender = await User.findById(item.sender);
            let senderAvatar = await File.findById(sender.avatar);
            let reactors = [];
            for (const el of item.responses) {
                let feedback = await Feedback.findById(el);
                let reactor = await User.findById(feedback.sender);
                let reactorObject = {
                    reactorFirstName:reactor.firstName,
                    reactorLastName:reactor.lastName,
                    content:feedback.content,
                    isLiked:feedback.isLiked,
                    numberOfLikes:feedback.numberOfLikes,
                    numberOfDislikes:feedback.numberOfDislikes,
                }
                reactors.push(reactorObject);
            }
            let responseObject = {
                firstName:sender.firstName,
                lastName:sender.lastName,
                avatar:senderAvatar.path,
                content:item.content,
                numberOfLikes:item.numberOfLikes,
                numberOfDislikes:item.numberOfDislikes,
                email:sender.email,
                numberOfComments:item.responses.length,
                addedOn:item.addedOn,
                isVisibleByOthers:item.isVisibleByOthers,
                reactors
            }
            if(req.cookies.json_token){
                let email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
                let user = await User.findOne({email})
                response.push({...responseObject,id:item._id,faqIsMine:item.sender == user._id});
            }else{
                response.push(responseObject);
            }
        }
        let token = jwt.sign({
            response,
            faqsCount:faqs.length,
            numberOfPages:Math.floor(faqs.length/itemsPerRequest) == 0 ? 1 : Math.floor(faqs.length/itemsPerRequest)
        },process.env.SECRET_KEY);
        res.status(200).json({response:token});
    } catch (error){
        res.status(404).json({error:"Error 404"});
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
                    avatar:userAvatar.path,
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
faqRouter.post("/comment",async(req,res)=>{
    try {
        let {email,comment} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/logout",async(req,res)=>{
    try {
        let email;
        let user;
        if(req.cookies.json_token){
            email = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY).email;
            user = await User.findOne({email});
            user.isLoggedIn = false;
            await user.save();
            res.cookie("json_token","",{maxAge:0});
        }
        res.redirect("/login");
    } catch (error) {
        console.log(error);
    }
})
app.get("/notifications",async(req,res)=>{
    try {
        let notification = [];
        let token = jwt.sign({notification},process.env.SECRET)
        res.json({token});
    } catch (error) {
        console.log(error);
    }
})
app.use((req,res)=>{
    res.redirect("")
})