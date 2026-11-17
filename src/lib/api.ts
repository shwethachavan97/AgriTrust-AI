const TOKEN_STORAGE_KEY = 'agritrust_session_token';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token && token.startsWith('at_')) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else if (!token) {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    const saved = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved) {
      inMemoryToken = saved;
      return saved;
    }
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function readAndResizeCropImage(file: File): Promise<{
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  imageData: string;
}> {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type.toLowerCase())) {
    throw new Error('Please upload a JPEG, PNG, or WebP crop image.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Selected image must be smaller than 10 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            fileName: file.name,
            mimeType: 'image/jpeg',
            fileSizeBytes: file.size,
            imageData: dataUrl,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.84);
        resolve({
          fileName: file.name,
          mimeType: 'image/jpeg',
          fileSizeBytes: Math.round((compressed.length * 3) / 4),
          imageData: compressed,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
