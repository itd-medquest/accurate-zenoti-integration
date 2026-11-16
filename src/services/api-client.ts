export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('imp:session-expired'));
    }
    const error: unknown = await response.json().catch(() => ({}));
    const fallback =
      response.status === 404
        ? 'Endpoint API tidak ditemukan (404). Restart backend untuk memuat fitur terbaru, lalu coba simpan kembali.'
        : response.status === 403
          ? 'Akses ditolak. Periksa hak akses akun Anda.'
          : response.status >= 500
            ? `Backend mengalami kesalahan (HTTP ${response.status}). Coba kembali atau periksa log backend.`
            : `Permintaan gagal (HTTP ${response.status}). Muat ulang data dan coba kembali.`;
    throw new Error(
      error !== null &&
        typeof error === 'object' &&
        'error' in error &&
        typeof error.error === 'string'
        ? error.error
        : fallback,
    );
  }
  return response;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return (await request(path, init)).json();
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await request(path)).blob();
}
