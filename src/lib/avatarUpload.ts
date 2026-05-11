import type { SupabaseClient } from '@supabase/supabase-js';

export const AVATAR_BUCKET = 'exercise_buddy_avatars';

const MAX_SIDE = 512;
const JPEG_QUALITY = 0.88;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

/** Downscale large picks client-side to keep uploads small. */
export async function avatarImageToJpegBlob(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('Invalid image dimensions.');

  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available.');
  ctx.drawImage(img, 0, 0, cw, ch);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('Could not encode image.');
  return blob;
}

export async function uploadBuddyAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  let jpeg: Blob;
  try {
    jpeg = await avatarImageToJpegBlob(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not process image.' };
  }

  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, jpeg, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (upErr) return { error: upErr.message || 'Upload failed.' };

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

/** Extract Storage object path (after bucket) from a public object URL, or null. */
export function parseAvatarStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.slice(i + marker.length).split('?')[0] ?? null;
}
