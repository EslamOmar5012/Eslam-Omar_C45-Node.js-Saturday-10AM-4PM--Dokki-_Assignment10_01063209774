import Joi from "joi";
import { GenderEnum, RoleEnum } from "../../common/index.js";

export const signupSchema = {
    body: Joi.object({
        firstName: Joi.string().min(2).max(25),
        lastName: Joi.string().min(2).max(25),
        userName: Joi.string().min(3).max(50),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required().messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
            'string.min': 'Password must be at least 8 characters long'
        }),
        phone: Joi.string().required(),
        gender: Joi.string().valid(GenderEnum.male, GenderEnum.female),
        role: Joi.string().valid(RoleEnum.user, RoleEnum.admin),
    }).oxor('userName', 'firstName') // userName OR firstName/lastName
        .required(),
};

export const loginSchema = {
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }).required(),
};

export const verifyEmailSchema = {
    body: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).required(),
    }).required(),
};

export const uploadProfilePicSchema = {
    file: Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string().valid("image/jpeg", "image/png", "image/gif", "image/webp").required(),
        destination: Joi.string().required(),
        filename: Joi.string().required(),
        path: Joi.string().required(),
        size: Joi.number().max(5 * 1024 * 1024).required(),
    }).required().messages({
        'any.required': 'Please upload an image',
        'string.empty': 'Please upload an image'
    }),
};

export const uploadCoverPicsSchema = {
    files: Joi.array().items(
        Joi.object({
            fieldname: Joi.string().required(),
            originalname: Joi.string().required(),
            encoding: Joi.string().required(),
            mimetype: Joi.string().valid("image/jpeg", "image/png", "image/gif", "image/webp").required(),
            destination: Joi.string().required(),
            filename: Joi.string().required(),
            path: Joi.string().required(),
            size: Joi.number().max(5 * 1024 * 1024).required(),
        })
    ).min(1).max(2).required(),
};

export const getAnotherProfileSchema = {
    params: Joi.object({
        userId: Joi.string().hex().length(24).required(),
    }).required(),
};
