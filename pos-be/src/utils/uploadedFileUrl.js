const getUploadedFileUrl = (file) => {
  if (!file) return null;
  if (typeof file.path === 'string' && /^https?:\/\//i.test(file.path)) return file.path;
  return file.filename ? `/uploads/${file.filename}` : null;
};

module.exports = { getUploadedFileUrl };
