export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const formats = new Set(IMAGE_ACCEPT.split(','));
/** Check declared type and file signature before asking the browser to decode it. */
export async function validateImage(file: File): Promise<void> {
  if (!formats.has(file.type))
    throw new Error('Use a JPEG, PNG or WebP image. HEIC, SVG, PDF and other formats are not supported.');
  if (!file.size) throw new Error('This image is empty. Choose another image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image no larger than 8 MB.');
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('Could not read this image. Choose another image.'));
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!{ 'image/png': png, 'image/jpeg': jpg, 'image/webp': webp }[file.type])
    throw new Error('The image contents do not match its format. Choose a valid JPEG, PNG or WebP image.');
}
