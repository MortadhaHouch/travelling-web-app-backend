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
let Faq = require("./models/Faq")
dotenv.config();
app.use(express.json());
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
                let user = await User.create({firstName,lastName,email,password,dateOfBirth:age,isMale,avatar:file._id});
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
        let userData = jwt.verify(req.cookies.json_token,process.env.SECRET_KEY);
        let foundUser = await User.findOne({email:userData.email});
        if(foundUser.isAdmin){
            let users = await User.find({isAdmin:false});
            let response = [];
            for (const element of users) {
                let {firstName,lastName,email,dateOfBirth,addedOn,avatar,isMale} = element;
                let userAvatar = await File.findById(avatar);
                response.push({firstName,lastName,email,dateOfBirth,addedOn,isMale,userAvatar:userAvatar.path});
            }
                res.status(200).json({response});
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
        let trip = await Trip.findOne({period,date});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.put("/:trip_id",checkUser,async (req,res)=>{
    let {destination} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try {
        let email = jwt.decode(req.cookies.json_token);
        let userID = await User.findOne({email})
        let trip = await Trip.create({destination,participators:[userID._id]});
        res.status(201).json({message:"congratulations!! you have participated to the trip to"+trip.destination});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.delete("/remove/:destination",checkUser,async(req,res)=>{
    let {destination} = req.params
    try {
        let foundTrip = await Trip.findOneAndDelete({destination});
        res.json({message:"trip removed successfully"});
    } catch (error) {
        res.status(404).json({message:"error removing the item"})
    }
})
tripRouter.delete("/users/remove/:userEmail",checkUser,async(req,res)=>{
    let {userEmail} = req.params
    try {
        let user = await User.findOne({email:userEmail});
        let trips = await Trip.find({});
        let trip = trips.filter((item)=>{
            return item.participators.includes(user._id);
        })
        trip.participators.splice(trip.participators.indexOf(user._id),1);
        await trip.save();
        res.json({message:"user removed successfully from trip"});
    } catch (error) {
        res.status(404).json({message:"error removing the item"})
    }
})
tripRouter.put("/react",async(req,res)=>{
    let {id,email} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let user = await User.findOne({email});
        let trip = await Trip.findById(id);
        if(!user.likedTrips.includes(id)){
            trip.numberOfLikes++;
            user.likedTrips.push(id);
        }else{
            trip.numberOfLikes--;
            user.likedTrips.splice(user.likedTrips.indexOf(id),1);
        }
        await user.save();
        await trip.save();
    } catch (error) {
        console.log(error);
    }
})
tripRouter.put("/save",async(req,res)=>{
    let {id,email} = jwt.verify(req.body.body,process.env.SECRET_KEY);
    try{
        let user = await User.findOne({email});
        let trip = await Trip.findById(id);
        if(!user.savedTrips.includes(id)){
            user.savedTrips.push(id);
            trip.numberOfSaves++;
        }else{
            user.savedTrips.splice(user.savedTrips.indexOf(id),1);
            trip.numberOfSaves--;
        }
        await user.save();
        await trip.save();
    } catch (error) {
        console.log(error);
    }
})
feedbackRouter.get("/",async(req,res)=>{
    try {
        let foundFeedbacks = await Feedback.find({});
        let feedbacks=[];
        for (const item of foundFeedbacks) {
            let user = await User.findById(item.sender);
            let userAvatar = await File.findById(user.avatar);
            feedbacks.push({
                content:item.content,
                numberOfLikes:item.numberOfLikes,
                userAvatar:userAvatar.path,
                userFirstName:user.firstName,
                userLastName:user.lastName,
                userEmail:user.email
            });
        }
        let token = jwt.sign({feedbacks},process.env.SECRET_KEY);
        res.status(200).json({response:token});
    } catch (error) {
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
faqRouter.get("/",async(req,res)=>{
    try {
        let faqs = await Faq.find({});
        let response = [];
        for (const faq of faqs){
            let sender = await User.findById(faq.sender);
            let avatar = await File.findById(sender.avatar)
            let reactors = [];
            for (const faqResponse of faq.responses) {
                let feedback = await Feedback.findById(faqResponse);
                let reactor = await User.findById(feedback.sender);
                let reactorAvatar = await File.findById(reactor.avatar)
                reactors.push({reactorFirstName:reactor.firstName,reactorLastName:reactor.lastName,reactorAvatar,content:feedback.content,isLiked:feedback.isLiked,numberOfLikes:feedback.numberOfLikes})
            }
            response.push({sender:sender.email,firstName:sender.firstName,lastName:sender.lastName,avatar,content:faq.content,reactors})
        }
        let token = jwt.sign({faqs:response},process.env.SECRET_KEY);
        res.status(200).json({response:token});
    } catch (error) {
        res.status(404).json({error:"Error 404"})
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
userRouter.get("/logout",(req,res)=>{
    res.cookie("json_token","",{maxAge:0});
    res.redirect("/login");
})
app.use((req,res)=>{
    res.redirect("")
})