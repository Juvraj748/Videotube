import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// const healthCheck = async(req, res, next){
//     try {
        
//     } catch (error) {
        
//     }
// }
// Instead of doing try catch everytime, use the asyncHandler

const healthCheck = asyncHandler(async (req, res) => {
    // return res.status(200).json({message: "Test ok"})
    // Instead of creating a response every time, use the standardised response using ApiResponse
    return res.status(200).json(new ApiResponse({statusCode: 200, data: "Ok", message:"Health check passed"}))
})

export {healthCheck}