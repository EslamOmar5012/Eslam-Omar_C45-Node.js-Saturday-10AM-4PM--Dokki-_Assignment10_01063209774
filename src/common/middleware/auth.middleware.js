import { throwError, verifyAccessToken } from "../index.js";
import { UserModel } from "../../db/index.js";
import { dbRepository } from "../../db/index.js";

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return throwError("Authentication required", 401);
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);

        const user = await dbRepository.findById(UserModel, decoded.id);
        if (!user) {
            return throwError("User not found", 401);
        }

        if (!user.isVerified) {
            return throwError("Please verify your email first", 401);
        }

        // Check if token was issued before the last credential change/logout
        if (user.chageCredentialTime && parseInt(user.chageCredentialTime.getTime() / 1000) > decoded.iat) {
            return throwError("Token revoked. Please login again.", 401);
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return next(new Error("Token expired"));
        }
        if (error.name === "JsonWebTokenError") {
            return next(new Error("Invalid token"));
        }
        next(error);
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return throwError("Forbidden: You don't have permission", 403);
        }
        next();
    };
};
