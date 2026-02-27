import { OAuth2Client } from "google-auth-library";
import { throwError, hashPassword, comparePassword, generateOTP, sendEmail, generateAccessToken, generateRefreshToken, verifyRefreshToken, ProviderEnum } from "../../common/index.js";
import { UserModel, OtpModel } from "../../db/index.js";
import { dbRepository } from "../../db/index.js";
import { envVars } from "../../../config/config.service.js";

const client = new OAuth2Client(envVars.googleClientId);

export const continueWithGoogle = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: envVars.googleClientId,
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub: googleId } = payload;

    // Check if user exists
    let user = await dbRepository.findOne(UserModel, { email });

    if (user) {
      // If user exists but doesn't have googleId, link it
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = ProviderEnum.google;
        await user.save();
      }
    } else {
      // Create new user
      user = await dbRepository.create(UserModel, {
        email,
        firstName: given_name,
        lastName: family_name || " ",
        googleId,
        provider: ProviderEnum.google,
        isVerified: true,
      });
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

    const userObject = user.toObject();
    delete userObject.password;

    return { user: userObject, accessToken, refreshToken };
  } catch (error) {
    console.error("Google Auth Error:", error);
    throwError("Invalid Google token", 401);
  }
};

export const signup = async (inputs) => {
  // Check if user already exists using repository
  const checkUserExist = await dbRepository.findOne(UserModel, { email: inputs.email });
  if (checkUserExist) {
    throwError("email already exist", 409);
  }

  // Hash password before storing
  const hashedPassword = await hashPassword(inputs.password);
  inputs.password = hashedPassword;

  // Create user using repository
  inputs.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  const user = await dbRepository.create(UserModel, inputs);

  // Generate and save OTP
  const otp = generateOTP();
  await dbRepository.create(OtpModel, {
    userId: user._id,
    otp,
  });

  // Send OTP via email with a nice layout
  const emailTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 20px auto; padding: 30px; border: 1px solid #eeeff1; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #1a73e8; margin: 0; font-size: 28px; font-weight: 600;">Saraha App</h1>
            <p style="color: #5f6368; margin-top: 5px; font-size: 16px;">Email Verification</p>
        </div>
        
        <div style="color: #3c4043; line-height: 1.6; font-size: 16px;">
            <p>Hello,</p>
            <p>Welcome to <strong>Saraha</strong>! To complete your registration and secure your account, please use the verification code below:</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <span style="display: inline-block; padding: 12px 25px; background-color: #f8f9fa; border: 2px dashed #1a73e8; border-radius: 8px; font-size: 36px; font-weight: bold; color: #1a73e8; letter-spacing: 8px;">${otp}</span>
                <p style="color: #70757a; font-size: 13px; margin-top: 10px;">Valid for 5 minutes</p>
            </div>
            
            <p style="margin-bottom: 0;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeff1; text-align: center; color: #70757a; font-size: 12px;">
            <p>&copy; 2026 Saraha App. All rights reserved.</p>
        </div>
    </div>
  `;

  await sendEmail({
    to: inputs.email,
    subject: "Verify your Saraha Account",
    html: emailTemplate,
  });

  return user;
};

export const login = async (inputs) => {
  // Check if user exists using repository
  const user = await dbRepository.findOne(UserModel, { email: inputs.email });
  if (!user) {
    throwError("Invalid email or password", 404);
  }

  // Verify password
  const isPasswordValid = await comparePassword(inputs.password, user.password);
  if (!isPasswordValid) {
    throwError("Invalid email or password", 401);
  }

  // Check if email is verified
  if (!user.isVerified) {
    throwError("Please verify your email first", 401);
  }

  // Return user without password
  const userObject = user.toObject();
  delete userObject.password;

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  return { user: userObject, accessToken, refreshToken };
};

export const verifyOtp = async (inputs) => {
  const { email, otp } = inputs;

  // Find user (with case-insensitive email check)
  const user = await dbRepository.findOne(UserModel, { email: email.trim() });
  if (!user) {
    throwError("User not found", 404);
  }

  if (user.isVerified) {
    throwError("Email already verified", 400);
  }

  // Find OTP
  const otpRecord = await dbRepository.findOne(OtpModel, { userId: user._id, otp: String(otp) });
  if (!otpRecord) {
    throwError("Invalid or expired OTP", 400);
  }

  // Update user verification status
  user.isVerified = true;
  user.confirmEmail = new Date();
  user.expiresAt = undefined; // Stop automatic deletion
  await user.save();

  // Delete OTP record
  await OtpModel.deleteOne({ _id: otpRecord._id });

  return { message: "Email verified successfully" };
};

export const refreshToken = async (token) => {
  try {
    const decoded = verifyRefreshToken(token);
    const user = await dbRepository.findById(UserModel, decoded.id);
    if (!user) {
      throwError("User not found", 404);
    }

    if (!user.isVerified) {
      throwError("Please verify your email first", 401);
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    return { accessToken };
  } catch (error) {
    throwError("Invalid or expired refresh token", 401);
  }
};

export const logout = async (userId) => {
  const user = await dbRepository.updateById(UserModel, userId, {
    chageCredentialTime: new Date()
  });
  if (!user) {
    throwError("User not found", 404);
  }
  return { message: "Logged out successfully" };
};

export const getAnotherProfile = async (userId) => {
  const user = await dbRepository.updateOne(
    UserModel,
    { _id: userId },
    { $inc: { visitCount: 1 } }
  );

  if (!user) {
    throwError("User not found", 404);
  }

  // Public profile
  return {
    _id: user._id,
    userName: user.userName,
    profilePic: user.profilePic,
    coverProfilePictures: user.coverProfilePictures,
    gallery: user.gallery,
    gender: user.gender,
    visitCount: user.visitCount // Include it here, let controller decide visibility
  };
};
