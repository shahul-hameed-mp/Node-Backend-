import { asyncHandler } from "../utils/asyncHandler.js";


const registerUser = asyncHandler(async (req, res) => {
    // const { email, password } = req.body;
    // Perform user registration logic here
    res.status(200).json({ message: "Ok" });
});


export {registerUser}