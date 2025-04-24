import dotenv from "dotenv"
import { app } from "./app.js";
import connectDb from "./db/index.js";

dotenv.config()
const port = process.env.PORT || 4000

connectDb()
.then((res) => {
    app.listen(port, () => {
        console.log("Server running on port:", port);
    })
})
.catch((err) => {
    console.log("MongoDB connection error:", err);
})