// src/lib/storage.ts
// Supabase Storage upload helpers — replaces the base64/dataURL approach.
// Images are compressed on the client (canvas) then uploaded as binary.
import { supabase } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Compress an image file to a smaller Blob using canvas. */
async function compressImageBlob(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 5MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image file to a Storage bucket.
 * Compresses the image first, then uploads as binary.
 * Returns the public URL (for public buckets) or the path (for private buckets).
 */
export async function uploadImage(bucket: string, path: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (JPG, PNG, etc.)');
  }
  const blob = await compressImageBlob(file);

  // Upload with upsert so re-uploads replace
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  // For public buckets, get the public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (urlData.publicUrl) return urlData.publicUrl;

  // For private buckets, generate a signed URL (valid 1 hour)
  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  return signedData?.signedUrl ?? path;
}

/**
 * Upload a non-image file (e.g. PDF) to a Storage bucket.
 * Returns the path or signed URL.
 */
export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 5MB.`);
  }
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (urlData.publicUrl) return urlData.publicUrl;

  const { data: signedData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  return signedData?.signedUrl ?? path;
}

/** Delete a file from a Storage bucket. */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Extract the storage path from a full URL or return as-is if already a path.
 * Used when deleting files.
 */
export function urlToPath(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) return url.slice(idx + marker.length);
  const signedMarker = `/object/sign/${bucket}/`;
  const sidx = url.indexOf(signedMarker);
  if (sidx >= 0) return decodeURIComponent(url.slice(sidx + signedMarker.length).split('?')[0]);
  // Already a path
  if (!url.startsWith('http')) return url;
  return null;
}
