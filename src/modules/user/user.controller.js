import fs from "fs";
import path from "path";
import { successResponse, throwError, verifyAccessToken, RoleEnum } from "../../common/index.js";
import { dbRepository } from "../../db/index.js";
import { UserModel } from "../../db/index.js";
import * as userService from "./user.service.js";

export const signupController = async (req, res, next) => {
  try {
    const user = await userService.signup(req.body);
    return successResponse({
      res,
      statusCode: 201,
      message: "user created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (req, res, next) => {
  try {
    const user = await userService.login(req.body);
    return successResponse({
      res,
      statusCode: 200,
      message: "user logged in successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailController = async (req, res, next) => {
  try {
    const result = await userService.verifyOtp(req.body);
    return successResponse({
      res,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshTokenController = async (req, res, next) => {
  try {
    const result = await userService.refreshToken(req.headers.token);
    return successResponse({
      res,
      statusCode: 200,
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePicController = async (req, res, next) => {
  try {
    if (!req.file) {
      return throwError("Please upload an image", 400);
    }

    const user = await dbRepository.findById(UserModel, req.user._id);
    if (!user) {
      return throwError("User not found", 404);
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;

    // Prepare update data
    const updateData = { profilePic: imageUrl };

    // If user has an old profile pic, add it to the gallery
    if (user.profilePic) {
      updateData.$push = { gallery: user.profilePic };
    }

    const updatedUser = await dbRepository.updateById(UserModel, req.user._id, updateData);

    return successResponse({
      res,
      statusCode: 200,
      message: "Profile picture updated successfully and old one moved to gallery",
      data: {
        profilePic: updatedUser.profilePic,
        gallery: updatedUser.gallery
      },
    });
  } catch (error) {
    next(error);
  }
};
export const continueWithGoogleController = async (req, res, next) => {
  try {
    const result = await userService.continueWithGoogle(req.body.idToken);
    return successResponse({
      res,
      statusCode: 200,
      message: "user logged in successfully with Google",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (req, res, next) => {
  try {
    const result = await userService.logout(req.user._id);
    return successResponse({
      res,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadCoverPicsController = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return throwError("Please upload at least one cover image", 400);
    }

    const user = await dbRepository.findById(UserModel, req.user._id);
    if (!user) {
      return throwError("User not found", 404);
    }

    const currentCoversCount = user.coverProfilePictures?.length || 0;
    const newCoversCount = req.files.length;
    const totalCovers = currentCoversCount + newCoversCount;

    if (totalCovers !== 2) {
      return throwError(
        `Total cover pictures must be exactly 2. You currently have ${currentCoversCount} and tried to upload ${newCoversCount}.`,
        400
      );
    }

    const imageUrls = req.files.map(
      (file) => `${req.protocol}://${req.get("host")}/${file.path.replace(/\\/g, "/")}`
    );

    const updatedUser = await dbRepository.updateById(UserModel, req.user._id, {
      $push: { coverProfilePictures: { $each: imageUrls } },
    });

    return successResponse({
      res,
      statusCode: 200,
      message: "Cover pictures uploaded successfully",
      data: { coverProfilePictures: updatedUser.coverProfilePictures },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProfilePicController = async (req, res, next) => {
  try {
    const user = await dbRepository.findById(UserModel, req.user._id);
    if (!user || !user.profilePic) {
      return throwError("No profile picture found", 404);
    }

    // Extract relative path from URL (after host)
    const host = req.get("host");
    const relativePath = user.profilePic.split(`${host}/`)[1];

    if (relativePath) {
      const fullPath = path.resolve(relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    user.profilePic = "";
    await user.save();

    return successResponse({
      res,
      statusCode: 200,
      message: "Profile picture deleted successfully from disk",
    });
  } catch (error) {
    next(error);
  }
};


export const getAnotherProfileController = async (req, res, next) => {
  try {
    const user = await userService.getAnotherProfile(req.params.userId);

    // Check if requester is Admin to show visitCount
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);
        const requestUser = await dbRepository.findById(UserModel, decoded.id);
        if (requestUser && requestUser.role === RoleEnum.admin) {
          isAdmin = true;
        }
      } catch (err) {
        // Token invalid or expired, proceed as guest
      }
    }

    if (!isAdmin) {
      delete user.visitCount;
    }

    return successResponse({
      res,
      statusCode: 200,
      message: "User profile fetched successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
