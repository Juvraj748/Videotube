import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js" 
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"

// Helper function
const generateRefreshAndAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if(!user){
            throw new ApiError(404, "User not found!");
        }
    
        const accessToken = user.generateAccesstoken()
        const refreshToken = user.generateRefreshtoken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: true})
    
        return {accessToken, refreshToken}
    } catch (error) {
        console.log("Error while generating tokens. Error:", error);
        throw new ApiError(500, "Error while generating refresh/access token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {fullname, email, username, password} = req.body

    // simple validation
    if([fullname, email, username, password].some((field) => !field?.trim())){
        throw new ApiError(401, "All fields are required", )
    }

    const existingUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existingUser){
        throw new ApiError(409, "User with email or username already exists", )
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path    

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing", )
    }

    let avatar = await uploadOnCloudinary(avatarLocalPath)

    let coverImage = ""
    if(coverLocalPath){
        coverImage = await uploadOnCloudinary(coverLocalPath)
    }

    try {
        const user = await User.create({
            avatar: avatar.url,
            coverImage: coverImage?.url || "".to,
            email, fullname, password, username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken" 
        )
    
        if(!createdUser){
            throw new ApiError(500, "Something went wrong while registering user")
        }
    
        return res
           .status(201)
           .json(
              new ApiResponse({
                 statusCode: 201,
                 data: createdUser,
                 message: "Successfully created User",
              })
           );

    } catch (error) {
        console.log("User creation failed! Error:", error);
        deleteFromCloudinary()
        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }

        throw new ApiError(500, "Something went wrong while creating user and images were deleted")
    }
})

const loginUser = asyncHandler(async(req, res) => {
    const { username, email, password } = req.body

    if(!email){
        throw new ApiError(400, "Email required for login");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(409, "User not found", )
    }

    const validPassword = await user.isPasswordCorrect(password)
    if(!validPassword){
        throw new ApiError(401, "Invalid credentials");
    }

    const {refreshToken, accessToken} = await generateRefreshAndAccessToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    if(!loggedInUser){
        throw new ApiError(400, "Unexpected error during login! Please try again.");
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse({statusCode: 200, 
        data: {user: loggedInUser, refreshToken, accessToken}, 
        message: "User logged in succesfully"}
    ))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshtoken = req.cookies.refreshToken || res.body.refreshToken
    if(!incomingRefreshtoken){
        throw new ApiError(401, "Refresh token is required")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshtoken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }

        if(incomingRefreshtoken !== user?.refreshToken){
            throw new ApiError(401, "Invalid refresh token")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }

        const {refreshToken: newRefreshToken, accessToken} = await generateRefreshAndAccessToken(user._id)

        return res
           .status(200)
           .cookie("accessToken", accessToken)
           .cookie("refreshToken", newRefreshToken)
           .json(
              new ApiResponse({
                 statusCode: 200,
                 data: { refreshToken: newRefreshToken, accessToken },
                 message: "Access token refreshed successfully",
              })
           );

    } catch (err) {
        throw new ApiError(500, "Somethin went wrong while generating accessToken")
    }
})

const logoutUser = asyncHandler(async (req, res) => {
    // For some reason we can't just do "id = req.body._id"
    await User.findByIdAndUpdate(
        // need to come back here after middleware
        req.user._id, {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true // return updated data
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
       .status(200)
       .clearCookie("refreshToken", options)
       .clearCookie("accessToken", options)
       .json(
          new ApiResponse({
             statusCode: 200,
             message: "Logged out successfully",
             data: {},
          })
       )

})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
}