import { Router } from "express";
import { registerUser ,loginUser,logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, 
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", 
    upload.fields([{ name: "avatar", maxCount: 1 },{name:"coverImage", maxCount: 1}]), 
    registerUser);

router.post("/login", loginUser);
router.post("/logout", verifyJwt, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJwt, changeCurrentPassword);
router.get("/current-user", verifyJwt, getCurrentUser);
router.patch("/update-account", verifyJwt, updateUserDetails);
router.patch("/update-avatar", verifyJwt, upload.single("avatar"), updateUserAvatar);
router.patch("/update-cover-image", verifyJwt, upload.single("coverImage"), updateUserCoverImage);
router.get("/c/:username",verifyJwt,getUserChannelProfile)
router.get("/history", verifyJwt, getWatchHistory);

export default router;