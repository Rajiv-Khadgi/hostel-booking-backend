import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';

// Cloudinary Configuration (Credentials should be in .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const imageFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Images only (jpg, jpeg, png, gif, webp)!'));
    }
};

const chatFileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|webp|txt|xls|xlsx|ppt|pptx|zip/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Supported formats: Images, PDF, Office Docs, Text, ZIP'));
    }
};

// Avatar Storage
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homespace/avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

// Property Storage
const propertyStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homespace/properties',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1200, height: 800, crop: 'limit' }]
    }
});

// Chat Storage
const chatStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homespace/chat',
        resource_type: 'auto'
    }
});

export const uploadImage = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export const uploadPropertyImage = multer({
    storage: propertyStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

export const uploadChatFile = multer({
    storage: chatStorage,
    fileFilter: chatFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

export default uploadImage;
