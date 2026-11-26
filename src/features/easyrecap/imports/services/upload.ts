import { API } from '@/services/api-client';
export type UploadProgress = { loaded: number; total: number | null; percent: number | null };
export function uploadInvoiceBatch<T>(
  form: FormData,
  onProgress: (progress: UploadProgress) => void,
  onTransferred: () => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    xhr.open('POST', `${API}/api/imports`);
    xhr.withCredentials = true;
    xhr.responseType = 'json';
    xhr.timeout = 600000;
    let transferred = false;
    const markTransferred = () => {
      if (!transferred) {
        transferred = true;
        onTransferred();
      }
    };
    xhr.upload.onprogress = (event) => {
      if (!transferred)
        onProgress({
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : null,
          percent:
            event.lengthComputable && event.total
              ? Math.min(100, Math.round((event.loaded / event.total) * 100))
              : null,
        });
      if (event.lengthComputable && event.total && event.loaded >= event.total) markTransferred();
    };
    xhr.upload.onload = markTransferred;
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as T);
        return;
      }
      if (xhr.status === 401) window.dispatchEvent(new Event('imp:session-expired'));
      reject(new Error(xhr.response?.error ?? 'Upload gagal. Periksa file dan coba kembali.'));
    };
    xhr.onerror = () => {
      cleanup();
      reject(
        new Error('Koneksi terputus saat upload. Periksa riwayat upload sebelum mencoba kembali.'),
      );
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(
        new Error('Waktu tunggu upload habis. Periksa riwayat upload sebelum mencoba kembali.'),
      );
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error('Upload dibatalkan. Periksa riwayat jika file sudah terkirim.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      cleanup();
      reject(new Error('Upload dibatalkan.'));
      return;
    }
    xhr.send(form);
  });
}
