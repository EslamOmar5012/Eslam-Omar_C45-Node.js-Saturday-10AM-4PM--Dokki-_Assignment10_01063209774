import { errorResponse } from "../index.js";

export const validation = (schemas) => {
    return (req, res, next) => {
        const validationErrors = [];

        // Keys to validate: body, query, params, headers
        const keys = Object.keys(schemas);

        for (const key of keys) {
            if (schemas[key]) {
                const { error } = schemas[key].validate(req[key], { abortEarly: false });
                if (error) {
                    validationErrors.push(...error.details.map((detail) => detail.message));
                }
            }
        }

        if (validationErrors.length > 0) {
            return errorResponse(res, validationErrors.join(", "), 400);
        }

        next();
    };
};
