import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

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

userSchema.pre("save", async function(next){ // Use pre because we want to run it before saving
    // If password is not being saved or updated, we don't need encrypt it
    // Fixed while creating register api
    if(!this.isModified("password")) next() 
    
    this.password = await bcrypt.hash(this.password, 10)

    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccesstoken = async function(){
    // short lived access token
    return jwt.sign({
        _id: this._id, 
        email: this.email, 
        username: this.username,
        fullname: this.fullname
    }, 
    process.env.ACCESS_TOKEN_SECRET, 
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}

userSchema.methods.generateRefreshtoken = async function(){
    // short lived refresh token
    return jwt.sign({
        _id: this._id,
    }, 
    process.env.REFRESH_TOKEN_SECRET, 
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}

export const User = mongoose.model("User", userSchema)