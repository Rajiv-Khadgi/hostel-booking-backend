import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = 'uploads/avatars';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const imageFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Images only!'));
    }
};

const chatFileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Mimetype check can be tricky for docs, relying on extension + magic numbers is better but extension is ok for MVP
    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Supported formats: Images, PDF, DOC, DOCX'));
    }
};

// Property images (hostels, rooms)
const propertyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const propDir = 'uploads/properties';
        if (!fs.existsSync(propDir)) {
            fs.mkdirSync(propDir, { recursive: true });
        }
        cb(null, propDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'property-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Chat attachments storage
const chatStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const chatDir = 'uploads/chat';
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }
        cb(null, chatDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

export const uploadChatFile = multer({
    storage: chatStorage,
    fileFilter: chatFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for docs
});

export const uploadPropertyImage = multer({
    storage: propertyStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Default export(image upload)
export default uploadImage;
