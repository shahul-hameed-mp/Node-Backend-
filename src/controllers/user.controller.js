import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError("Error generating tokens", 500);
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from front-end 
    // validation (not empty)
    // check if user already exists (username, email)
    // check for images (check for avatar)
    // upload them to cloudinary (avatar)
    //  create user object (create entry in db)
    // create password and refresh token fields from the response
    // check for user creation 
    //  return response

    const {fullName,email,username,password} = req.body;
    if (
        [fullName,email,username,password].some((field)=>
        field?.trim() === "")
    ){
        throw new ApiError("All fields are required", 400);
    }
    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    });

    if (existingUser) {
        throw new ApiError("User already exists", 409);
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath){
        throw new ApiError("Avatar is required", 400);
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;
    if (!avatar){
        throw new ApiError("Error in uploading avatar", 500);
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(201).json(new ApiResponse(200,"User registered successfully", createdUser));


});


const loginUser = asyncHandler(async (req,res) =>{

    const {username,email,password} = req.body;
    
    if (!username && !email){
        throw new ApiError("Username or email is required to login",400);
    }

    const user = await User.findOne({$or: [{username}, {email}]});
    if (!user){
        throw new ApiError("Invalid credentials",401);
    }
    const isPasswordMatch = await user.isPasswordCorrect(password);
    if (!isPasswordMatch){
        throw new ApiError("Invalid credentials",401);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options ={
        httpOnly: true,
        secure: true
    }

   return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(
            200,
            "User logged in successfully",
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            }
        )
    );
});

const logoutUser = asyncHandler(async (req,res) =>{
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } }, { new: true });
     const options ={
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("refreshToken", options )
    .cookie("accessToken", options )
    .json(new ApiResponse(200,"User logged out successfully", {}));
});

const refreshAccessToken =asyncHandler(async (req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError("No refresh token provided", 401);
    }

    try{
        const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id);

        if (!user || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError("Invalid refresh token", 401);
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(new ApiResponse(200, "Access token refreshed successfully", { accessToken, refreshToken: newRefreshToken }));
    } catch (error) {
        throw new ApiError("Failed to refresh access token", 500);
    }
});

export {registerUser , loginUser,logoutUser, refreshAccessToken}