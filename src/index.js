import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";


dotenv.config({
    path: './.env'
});


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.error("MongoDB connection failed !!:", error);
});

/*
import express from "express";
const app = express();

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`Connected to MongoDB database: ${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("Error",error);
            throw error
        });
        app.listen(process.env.PORT,()=>{
            console.log(`App listening on port: ${process.env.PORT}`);
        });

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error
    }
})() 
    */
