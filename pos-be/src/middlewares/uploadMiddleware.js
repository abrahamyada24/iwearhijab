const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { isCloudinaryConfigured, uploadDir } = require('../config/storage');

/**
 * LOGIKA PENYIMPANAN LOKAL (Disk Storage)
 * Gambar akan disimpan secara fisik di folder: pos-be/public/uploads
 */
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate nama file unik: asset-timestamp-random.ekstensi
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

const cloudinaryStorage = {
    _handleFile(req, file, cb) {
        const publicId = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: `${process.env.CLOUDINARY_FOLDER || 'kasirpos'}/store-${req.storeId || 'public'}`,
            public_id: publicId,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        }, (error, result) => {
            if (error) return cb(error);

            return cb(null, {
                path: result.secure_url,
                filename: result.public_id,
                publicId: result.public_id,
                size: result.bytes,
            });
        });

        file.stream.pipe(uploadStream);
    },
    _removeFile(req, file, cb) {
        if (!file.publicId) return cb(null);
        return cloudinary.uploader.destroy(file.publicId, { resource_type: 'image' }, cb);
    },
};

const storage = isCloudinaryConfigured
    ? cloudinaryStorage
    : diskStorage;

// Filter file untuk memastikan hanya gambar yang boleh diupload
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak didukung! Gunakan JPG, PNG, atau WEBP.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Batasi 2MB agar penyimpanan lokal tidak cepat penuh
    fileFilter: fileFilter
});

module.exports = upload;
