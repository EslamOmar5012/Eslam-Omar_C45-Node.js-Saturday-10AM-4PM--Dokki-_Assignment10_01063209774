import multer from "multer";
import path from "path";
import fs from "fs";

export const fileValidation = {
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    file: ["application/pdf", "application/msword"],
};

export const localMulter = ({ folder = "general", validExtensions = fileValidation.image }) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = `uploads/${folder}`;
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + "-" + file.originalname);
        },
    });

    const fileFilter = (req, file, cb) => {
        if (validExtensions.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file format!"), false);
        }
    };

    return multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB default
        },
    });
};
