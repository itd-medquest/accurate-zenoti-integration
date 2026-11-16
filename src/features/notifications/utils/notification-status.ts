export function notificationStatus(status: string) {
  switch (status) {
    case 'FAILED':
      return {
        label: 'Pengiriman gagal',
        description: 'Periksa penyebab kegagalan sebelum mencoba kembali.',
        variant: 'destructive',
        attention: true,
      } as const;
    case 'NEEDS_REVIEW':
      return {
        label: 'Perlu diperiksa',
        description: 'Invoice membutuhkan pemeriksaan Finance.',
        variant: 'warning',
        attention: true,
      } as const;
    case 'SYNCED':
      return {
        label: 'Pemrosesan selesai',
        description: 'Buka detail untuk melihat hasil pemrosesan invoice.',
        variant: 'success',
        attention: false,
      } as const;
    case 'PROCESSING':
      return {
        label: 'Sedang diproses',
        description: 'Invoice sedang diproses. Status akan diperbarui otomatis.',
        variant: 'info',
        attention: false,
      } as const;
    case 'PENDING':
      return {
        label: 'Dalam antrean',
        description: 'Invoice menunggu giliran pemrosesan.',
        variant: 'secondary',
        attention: false,
      } as const;
    case 'LOCAL_ONLY':
    case 'LOCAL_ONLY_CONSULTATION':
      return {
        label: 'Tersimpan lokal',
        description: 'Invoice disimpan sebagai referensi tanpa dikirim ke Accurate.',
        variant: 'secondary',
        attention: false,
      } as const;
    default:
      return {
        label: 'Status invoice',
        description: 'Buka detail untuk memeriksa status invoice.',
        variant: 'secondary',
        attention: false,
      } as const;
  }
}
