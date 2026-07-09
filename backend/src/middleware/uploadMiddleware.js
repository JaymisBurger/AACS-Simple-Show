import multer from 'multer';
import { env } from '../config/env.js';
import { isAllowedImageMimeType } from '../services/uploadStorageService.js';

export const floorMapUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadSizeBytes
  },
  fileFilter(req, file, callback) {
    if (!isAllowedImageMimeType(file.mimetype)) {
      return callback(new Error('Unsupported file type. Upload a PNG, JPG, JPEG, or WEBP image.'));
    }

    callback(null, true);
  }
});

export const vendorLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.vendorLogoMaxSizeBytes
  },
  fileFilter(req, file, callback) {
    const extension = file.originalname?.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
    const validExtension = ['.png', '.jpg', '.jpeg', '.webp'].includes(extension);

    if (!validExtension || !isAllowedImageMimeType(file.mimetype)) {
      return callback(new Error('Unsupported logo type. Upload a PNG, JPG, JPEG, or WEBP image.'));
    }

    callback(null, true);
  }
});
