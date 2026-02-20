import Joi from "joi";
import { GenderEnum } from "../../common/index.js";

export const signupSchema = {
    body: Joi.object({
        firstName: Joi.string().min(2).max(25).required(),
        lastName: Joi.string().min(2).max(25).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required().messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
            'string.min': 'Password must be at least 8 characters long'
        }),
        phone: Joi.string().required(),
        gender: Joi.string().valid(GenderEnum.male, GenderEnum.female),
    }).required(),
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
