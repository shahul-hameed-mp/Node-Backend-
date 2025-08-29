import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// routes import
import userRoutes from "./routes/user.routes.js";
// routes declaration
app.use("/api/v1/users", userRoutes);
export {app}