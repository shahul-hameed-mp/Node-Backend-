import dotenv from "dotenv";
import connectDB from "./db/index.js";



dotenv.config({
    path: './.env'
});


connectDB();



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
