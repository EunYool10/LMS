// Profile photos are kept in the user record as a small JPEG data URL: the server's disk is wiped on
// every deploy, and a full-size photo would not fit in a Firestore document.
const AVATAR_SIZE = 256;

/** Center-crops the photo to a square and shrinks it to at most 256px. */
export function shrinkAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const size = Math.min(AVATAR_SIZE, side);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx || !side) return reject(new Error('이미지를 읽을 수 없습니다.'));
      ctx.fillStyle = '#ffffff'; // transparent PNGs would turn black as JPEG
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };
    img.src = url;
  });
}
