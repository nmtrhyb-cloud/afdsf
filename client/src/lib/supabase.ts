// Supabase has been replaced with local file storage
// Image upload is now handled via the /api/upload server route

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadImage(file: File, bucket: string = 'general'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(err.message || 'فشل في رفع الصورة');
  }

  const data = await response.json();
  return { url: data.url, path: data.path };
}

export async function deleteImage(path: string, bucket: string = 'general'): Promise<boolean> {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, bucket }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Stub for any code that imports supabase directly
export const supabase = null;
