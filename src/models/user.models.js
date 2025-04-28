import mongoose, { Schema } from "mongoose"

const userSchema = new Schema(
    {
        // perfectly valid
        // username: String,
        // But, we can have more control
        username: {
            type: String,
            required: true, 
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true, 
            unique: true,
            lowercase: true,
            trim: true,
        }, 
        fullname: {
            type: String,
            required: true, 
            trim: true,
        }, 
        avatar: {
            type: String, // cloudinary url
            required: true, 
        },
        coverImage: {
            type: String, // cloudinary url
        }, 
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            }
        ],
        password: {
            type: String, 
            required: [true, "pasword is required"]
        }, 
        refreshToken: {
            type: String
        }
    }, 
    {
        timestamps: true // Automatically adds createdAt, updatedAt for each field
    }
)

export const User = mongoose.model("User", userSchema)