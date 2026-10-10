const path = require('path');

const defaultUploadDir = path.join(__dirname, '../../public/uploads');
const uploadDir = path.resolve(process.env.UPLOAD_DIR || defaultUploadDir);
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);

module.exports = { isCloudinaryConfigured, uploadDir };
