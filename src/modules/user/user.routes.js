import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate, authorize, RoleEnum, localMulter, validation } from "../../common/index.js";
import { signupSchema, loginSchema, verifyEmailSchema, uploadProfilePicSchema, uploadCoverPicsSchema, getAnotherProfileSchema } from "./user.validation.js";

const router = Router();

router.post("/signup", validation(signupSchema), userController.signupController);
router.post("/login", validation(loginSchema), userController.loginController);
router.post("/verify-email", validation(verifyEmailSchema), userController.verifyEmailController);
router.post("/google-auth", userController.continueWithGoogleController);
router.post("/refresh-token", userController.refreshTokenController);
router.post("/logout", authenticate, userController.logoutController);

// Example protected route
router.get("/profile", authenticate, (req, res) => {
    res.status(200).json({ status: "success", data: req.user });
});

router.get("/profile/:userId", validation(getAnotherProfileSchema), userController.getAnotherProfileController);

// Example admin only route
router.get("/admin-only", authenticate, authorize(RoleEnum.admin), (req, res) => {
    res.status(200).json({ status: "success", message: "Welcome Admin" });
});

router.post("/profile-image", authenticate, localMulter({ folder: "profile-images" }).single("image"), validation(uploadProfilePicSchema), userController.uploadProfilePicController);
router.delete("/profile-image", authenticate, userController.deleteProfilePicController);
router.post("/cover-images", authenticate, localMulter({ folder: "cover-images" }).array("images", 2), validation(uploadCoverPicsSchema), userController.uploadCoverPicsController);

export default router;
