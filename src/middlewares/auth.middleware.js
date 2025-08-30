import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJwt= asyncHandler(async (req,res,next)=>{
   try {
       const token = req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];
       if (!token) {
           throw new ApiError("No token provided", 401);
       }
       const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
       const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
       if (!user) {
           throw new ApiError("invalid access Token", 401);
       }
       req.user = user;
       next();
   } catch (error) {
       throw new ApiError(error?.message || "Unauthorized access", 401);
   }
})