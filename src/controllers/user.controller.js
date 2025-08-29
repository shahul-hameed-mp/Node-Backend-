import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/User.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

    const createdUser = await user.findById(user._id).select("-password -refreshToken");

    if (!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(201).json(new ApiResponse(200,"User registered successfully", createdUser));


});


export {registerUser}