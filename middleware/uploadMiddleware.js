import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/hostels');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
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

export const uploadImage = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

export const uploadChatFile = multer({
    storage,
    fileFilter: chatFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for docs
});

// Default export for backward compatibility (points to image upload)
export default uploadImage;
