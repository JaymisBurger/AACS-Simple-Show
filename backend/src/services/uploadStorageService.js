import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { imageSize } from 'image-size';
import { env } from '../config/env.js';

const allowedMimeTypes = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp']
]);

export function isAllowedImageMimeType(mimeType) {
  return allowedMimeTypes.has(mimeType);
}

export async function saveFloorMapFile(file) {
  if (!isAllowedImageMimeType(file.mimetype)) {
    const error = new Error('Unsupported file type. Upload a PNG, JPG, JPEG, or WEBP image.');
    error.status = 415;
    throw error;
  }

  await fs.mkdir(env.uploadDir, { recursive: true });

  const extension = allowedMimeTypes.get(file.mimetype);
  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(env.uploadDir, filename);

  await fs.writeFile(absolutePath, file.buffer);

  const dimensions = imageSize(file.buffer);

  if (!dimensions.width || !dimensions.height) {
    await deleteFloorMapFile(`/uploads/${filename}`);
    const error = new Error('Unable to read image dimensions.');
    error.status = 422;
    throw error;
  }

  return {
    imageUrl: `/uploads/${filename}`,
    absolutePath,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height
  };
}

export async function saveVendorLogoFile(file) {
  if (!isAllowedImageMimeType(file.mimetype)) {
    const error = new Error('Unsupported logo type. Upload a PNG, JPG, JPEG, or WEBP image.');
    error.status = 415;
    throw error;
  }

  await fs.mkdir(path.join(env.uploadDir, 'vendor-logos'), { recursive: true });

  const extension = allowedMimeTypes.get(file.mimetype);
  const filename = `${randomUUID()}${extension}`;
  const relativeUrl = `/uploads/vendor-logos/${filename}`;
  const absolutePath = path.join(env.uploadDir, 'vendor-logos', filename);

  await fs.writeFile(absolutePath, file.buffer);

  const dimensions = imageSize(file.buffer);
  if (!dimensions.width || !dimensions.height) {
    await deleteUploadedFile(relativeUrl);
    const error = new Error('Unable to read logo dimensions.');
    error.status = 422;
    throw error;
  }

  return {
    imageUrl: relativeUrl,
    absolutePath,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height
  };
}

export async function deleteFloorMapFile(imageUrl) {
  return deleteUploadedFile(imageUrl);
}

export async function deleteUploadedFile(imageUrl) {
  if (!imageUrl?.startsWith('/uploads/')) return;

  const relativePath = imageUrl.replace(/^\/uploads\//, '');
  const absolutePath = path.join(env.uploadDir, relativePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
