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
dotenv.config();
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cors({
    origin:"*",
    methods:["GET","POST","PUT","DELETE"],
}))
app.use("/user",userRouter);
let User = require("./models/user")
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
                res.status(200).json({email,userName:foundUser.email,token,isAdmin:foundUser.isAdmin});
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
                let admin = await user.checkIsAdmin();
                let maxAge=60*60*24*3;
                let token = jwt.sign({email,password},process.env.SECRET_KEY,{expiresIn:maxAge});
                res.status(201).json({firstName,lastName,token,isAdmin:admin.isAdmin});
            }
        }
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