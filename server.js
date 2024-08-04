let express  = require("express");
let app = express();
let dotenv = require("dotenv");
let bodyParser = require("body-parser");
let cors = require("cors")
let userRouter = require("./routes/userRouter");
let tripRouter = require("./routes/tripRouter");
let feedbackRouter = require("./routes/feedbackRouter");
let faqRouter = require("./routes/faqRouter");
let notificationRouter = require("./routes/notificationRouter");
let cookieParser = require("cookie-parser");
let commentsRouter = require("./routes/commentRouter");
let helmet = require("helmet");
dotenv.config();
app.use(express.json({limit:"10mb"}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json({limit:"10mb"}))
app.use(cors({
    origin:"http://localhost:5173",
    methods:["GET","POST","PUT","DELETE"],
    credentials:true
}))
app.use(cookieParser())
app.use(helmet())
app.use("/user",userRouter);
app.use("/trips",tripRouter);
app.use("/feedbacks",feedbackRouter);
app.use("/faqs",faqRouter);
app.use("/comments",commentsRouter);
app.use("/notifications",notificationRouter);
app.listen(3000,()=>{
    console.log("server running on port 3000");
})
app.use((req,res)=>{
    res.redirect("")
})