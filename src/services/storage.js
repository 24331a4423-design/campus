import { supabase } from './supabase';

const BUCKET_NAME = 'item-images';

/**
 * Uploads a file to the specified folder (lost/ or found/) in the item-images bucket.
 * @param {File} file - The file object from input.
 * @param {'lost'|'found'} type - The subfolder name.
 * @param {function} onProgress - Callback for upload progress.
 * @returns {Promise<string>} - The relative path of the uploaded file.
 */
export const uploadImage = async (file, type, onProgress = () => {}) => {
  if (!file) throw new Error('No file provided for upload.');

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.');
  }

  // Validate file size (5MB = 5 * 1024 * 1024 bytes)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds the maximum limit of 5 MB.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${type}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  // Supabase Storage Upload
  // Since supabase-js doesn't have a direct progress event on upload(), we simulate upload progress
  // or use direct upload.
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error uploading image to Supabase:', error);
    if (error.message && error.message.toLowerCase().includes('bucket not found')) {
      throw new Error(
        "Supabase Storage bucket 'item-images' not found. Please log in to your Supabase Console, navigate to Storage, and create a private bucket named 'item-images' with RLS enabled."
      );
    }
    throw error;
  }

  // Simulate progress to update the UI progress bar to 100%
  onProgress(100);

  return data.path; // e.g., 'lost/1628392-ab12.png'
};

/**
 * Generates a signed URL to securely view private images.
 * @param {string} path - The relative storage path (e.g., 'lost/filename.jpg').
 * @param {number} expiresIn - Expiry time in seconds (default 1 hour).
 * @returns {Promise<string>} - The signed URL.
 */
export const getSignedImageUrl = async (path, expiresIn = 3600) => {
  if (!path) return '';
  
  // If path is already a full URL, return it
  if (path.startsWith('http')) return path;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error generating signed URL:', error);
    return '';
  }

  return data.signedUrl;
};

/**
 * Deletes an image from the storage bucket.
 * @param {string} path - The relative storage path.
 */
export const deleteImage = async (path) => {
  if (!path || path.startsWith('http')) return;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting image from Supabase Storage:', error);
    throw error;
  }
};

/**
 * Replaces an existing image with a new one.
 * @param {string} oldPath - The path of the old image to delete.
 * @param {File} newFile - The new file to upload.
 * @param {'lost'|'found'} type - The subfolder name.
 * @param {function} onProgress - Callback for upload progress.
 * @returns {Promise<string>} - The new path.
 */
export const replaceImage = async (oldPath, newFile, type, onProgress = () => {}) => {
  if (oldPath && !oldPath.startsWith('http')) {
    try {
      await deleteImage(oldPath);
    } catch (e) {
      console.warn('Failed to delete old image, continuing with upload:', e);
    }
  }
  return await uploadImage(newFile, type, onProgress);
};
