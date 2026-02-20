import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate, authorize, RoleEnum, upload, validation } from "../../common/index.js";
import { signupSchema, loginSchema, verifyEmailSchema } from "./user.validation.js";

const router = Router();

router.post("/signup", validation(signupSchema), userController.signupController);
router.post("/login", validation(loginSchema), userController.loginController);
router.post("/verify-email", validation(verifyEmailSchema), userController.verifyEmailController);
router.post("/google-auth", userController.continueWithGoogleController);
router.post("/refresh-token", userController.refreshTokenController);

// Example protected route
router.get("/profile", authenticate, (req, res) => {
    res.status(200).json({ status: "success", data: req.user });
});

// Example admin only route
router.get("/admin-only", authenticate, authorize(RoleEnum.admin), (req, res) => {
    res.status(200).json({ status: "success", message: "Welcome Admin" });
});

router.post("/upload-profile-pic", authenticate, upload.single("image"), userController.uploadProfilePicController);

export default router;
