import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js" 
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"

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

export {
    registerUser
}