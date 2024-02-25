let express  = require("express");
let app = express();
let dotenv = require("dotenv");
let bodyParser = require("body-parser");
let checkUser = require("./middlewares/checkUser");
let jwt = require("jsonwebtoken");
let bcrypt = require("bcrypt");
let cors = require("cors")
let multer = require("multer")
let uploads = multer({dest:"./uploads"})
let userRouter = express.Router();
let User = require("./models/user");
let file = require("./models/File")
let Trip = require("./models/Trip")
let tripRouter = express.Router();
let cookieParser = require("cookie-parser")
dotenv.config();
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser())
app.use(cors({
    origin:"*",
    methods:["GET","POST","PUT","DELETE"],
}))
app.use("/user",userRouter);
app.use("/trips",tripRouter);
app.listen(3000,()=>{
    console.log("server running on port 3000");
})
app.get("/home/destinations",checkUser,(req,res)=>{
    res.redirect("/home/destinations");
})
userRouter.post("/login",async (req,res)=>{
    let {email,password} = req.body;
    try {
        let foundUser = await User.findOne({email});
        if(foundUser){
            let foundPassword = await bcrypt.compare(password,foundUser.password);
            if(foundPassword){
                let maxAge=60*60*24*3;
                let token = jwt.sign({email,password},process.env.SECRET_KEY,{expiresIn:maxAge});
                res.status(200).json({
                        userFirstName:foundUser.firstName,
                        userLastName:foundUser.lastName,
                        isAdmin:foundUser.isAdmin,
                        token
                    });
            }else{
                res.status(404).json({password_error:"Please verify your password"});
            }
        }else{
            res.status(404).json({email_error:"User not found"});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/signup",(req,res)=>{
    res.redirect("/user/signup")
})
userRouter.post("/signup",async (req,res)=>{
    let {firstName,lastName,email,password} = req.body;
    try {
        let userFoundByEmail = await User.findOne({email});
        if(userFoundByEmail){
            res.json({email_existence_error:"user with this email is already existing"});
        }else{
            if(userFoundByEmail?.firstName == firstName){
                res.json({firstName_existence_error:"user with this name is already existing"});
            }else{
                let user = await User.create({firstName,lastName,email,password});
                let maxAge=60*60*24*3;
                let token = jwt.sign({email,password},process.env.SECRET_KEY,{expiresIn:maxAge});
                res.status(201).json({
                    userFirstName:user.firstName,
                    userLastName:user.lastName,
                    isAdmin:user.isAdmin,
                    token
                });
            }
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.get("/users",checkUser,async (req,res)=>{
    try {
        let userData = jwt.verify(req.body.token,process.env.SECRET_KEY);
        let foundUser = await User.findOne({email:userData.email});
        if(foundUser.isAdmin){
            let users = await User.find({isAdmin:false});
            res.status(200).json({users})
        }else{
            res.status(401).json({response:"you are not authorized to see these chunks of data"});
        }
    } catch (error) {
        console.log(error);
    }
})
userRouter.delete("/users/:user_id",checkUser,async (req,res)=>{
    try {
        let userData = jwt.verify(req.body.token,process.env.SECRET_KEY);
        let foundUser = await User.findOne({email:userData.email});
        if(foundUser.isAdmin){
            await User.findOneAndDelete({_id:req.params.user_id});
            let users = await User.find({});
            res.status(200).json({users})
        }else{
            res.status(401).json({response:"OOPS!! failed deleting the user"});
        }
    } catch (error) {
        console.log(error);
    }
})
tripRouter.get("/",async (req,res)=>{
    try {
        let trips = Trip.find({});
        res.status(200).json({trips})
    } catch (error) {
        console.log(error);
    }
})
tripRouter.post("/:trip_id",checkUser,async (req,res)=>{
    let {destination} = req.body;
    try {
        let email = jwt.decode(req.cookies.json_token);
        let userID = await User.findOne({email})
        let trip = await Trip.create({destination,participators:[userID._id]});
        res.status(201).json({message:"congratulations!! you have participated to the trip to"+trip.destination});
    } catch (error) {
        console.log(error);
    }
})
tripRouter.put("/:trip_id",checkUser,async (req,res)=>{
    let {destination} = req.body;
    try {
        let email = jwt.decode(req.cookies.json_token);
        let userID = await User.findOne({email})
        let trip = await Trip.create({destination,participators:[userID._id]});
        res.status(201).json({message:"congratulations!! you have participated to the trip to"+trip.destination});
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