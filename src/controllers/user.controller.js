import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { mongo } from "mongoose";


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

const changeCurrentPassword =asyncHandler(async (req,res) =>{
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError("Current password and new password are required", 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError("User not found", 404);
    }

    const isPasswordMatch = await user.isPasswordCorrect(currentPassword);
    if (!isPasswordMatch) {
        throw new ApiError("Current password is incorrect", 401);
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, "Password changed successfully", {}));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200,req.user,"current user fetched successfully");
});

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError("Full name and email are required", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true }
    ).select("-password ");

  

    return res.status(200).json(new ApiResponse(200, "User details updated successfully", user));
});

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400);
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url){
        throw new ApiError("Failed to upload avatar", 500);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password ");

    return res.status(200).json(new ApiResponse(200, "User avatar updated successfully", user));
});


const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError("Cover image is required", 400);
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url){
        throw new ApiError("Failed to upload cover image", 500);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password ");

    return res.status(200).json(new ApiResponse(200, "User cover image updated successfully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const {username} = req.params;

    if (!username ){
        throw new ApiError("Username is required", 400);
    }

    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: { $cond: { if: { $in: [req.user._id, "$subscribers.subscriber"] }, then: true, else: false } }
            },
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])

    if (!channel?.length){
        throw new ApiError("Channel not found", 404);
    }

    return res.status(200).json(new ApiResponse(200, "User channel profile fetched successfully", channel[0]));
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user._id) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: { $first: "$owner"}
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, "Watch history fetched successfully", user[0].watchHistory));
})

export {registerUser , loginUser,logoutUser, refreshAccessToken, 
    changeCurrentPassword,getCurrentUser,updateUserDetails,updateUserAvatar, 
    updateUserCoverImage,getUserChannelProfile,getWatchHistory}