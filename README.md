# intgrte — Frontend

Platform untuk meninjau invoice Zenoti dan mengelola pengiriman Faktur Penjualan ke Accurate Online. Dibangun dengan Next.js App Router, React, TypeScript, Tailwind CSS, dan komponen shadcn/ui.

## Fitur

- Dashboard ringkasan invoice dan aktivitas sinkronisasi.
- Riwayat upload dengan pencarian, filter perusahaan, tanggal, dan status invoice.
- Upload PDF atau Excel, preview dokumen, koreksi item, mapping customer/item Accurate, serta pemeriksaan sebelum submit.
- Penanda item redeemed dan Consultation gratis yang disimpan sebagai referensi tanpa dikirim ke Accurate.
- Super Admin dan Finance dapat membuat customer Accurate dari hasil pencarian kosong saat review invoice. Nomor MPA dan master default diperiksa otomatis; setelah konfirmasi, customer dibuat lalu dipakai sebagai mapping invoice.
- Pengaturan koneksi Accurate, perusahaan tujuan, pengguna, notifikasi, dan audit sesuai hak akses.
- Tampilan responsif, mode terang/gelap, dan dukungan reduced motion.

Upload dan preview tidak langsung mengirim transaksi. Pengiriman faktur dilakukan setelah pemeriksaan dan submit; hasilnya mengikuti konfigurasi backend. Halaman Penerimaan Penjualan menyediakan daftar pembayaran, filter, review, simpan draft, saldo Accurate, dan pengiriman setelah konfirmasi Finance. Mapping akun kas/bank dan biaya diatur pada tab Akun penerimaan di Settings. Status diperbarui otomatis; hasil pengiriman yang belum pasti dapat diperiksa di Accurate tanpa membuat transaksi kedua. Modul Command menampilkan Coming Soon.

## Persyaratan

- Node.js **22.16 atau lebih baru** dan npm.
- Backend intgrte yang aktif; alamat lokal default `http://localhost:4000`.
- Google Chrome untuk pengujian browser dengan Playwright.

## Menjalankan secara lokal

Clone kedua repository sebagai folder `frontend` dan `backend` yang berdampingan. Susunan ini juga digunakan oleh pengujian integrasi.

```powershell
git clone https://github.com/itd-medquest/accurate-zenoti-integration.git frontend
git clone https://github.com/itd-medquest/be-accurate-zenoti-integration.git backend
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Buka `http://localhost:3000`. Siapkan dan jalankan backend di terminal terpisah mengikuti README backend. Backend menggunakan MySQL 8.4 LTS. Akun lokal mengikuti seed admin atau import akun lama di backend; tampilan dan alur frontend tidak berubah.

### Konfigurasi

| Variabel              | Kegunaan                            | Default lokal           |
| --------------------- | ----------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | Alamat backend tanpa akhiran `/api` | `http://localhost:4000` |

Variabel berawalan `NEXT_PUBLIC_` tersedia di browser. Simpan kredensial Accurate dan secret lainnya di backend. Setelah mengubah alamat API, restart server pengembangan; untuk deployment, buat ulang build dengan nilai yang sesuai.

### Pengaturan perusahaan

Super Admin dapat mengelola daftar perusahaan melalui **Settings → Perusahaan**. Koneksi Accurate, tujuan perusahaan, dan akun penerimaan mengikuti perusahaan yang dipilih pada pengaturan. Perusahaan baru memerlukan kredensialnya sendiri. Penghapusan meminta konfirmasi nama dan hanya tersedia untuk perusahaan tanpa riwayat upload/transaksi.

### Pembaruan data dan beban request

Dashboard serta riwayat Faktur/Penerimaan Penjualan memuat data saat halaman dibuka atau filter berubah. Riwayat Faktur/Penerimaan juga menyediakan tombol **Muat ulang**. Bar filter dashboard hanya menampilkan pilihan cabang dan periode. Halaman tanpa proses aktif tidak melakukan polling berkala. Dashboard memakai status `processing`; invoice yang masih menunggu/draft tidak memicu polling cepat.

Pengiriman aktif diperiksa setiap 15 detik setelah request sebelumnya selesai, termasuk detail invoice, batch, dan penerimaan. Polling berhenti setelah proses selesai atau request gagal, dijeda saat tab tersembunyi, dan request dibatalkan ketika konteks halaman/filter berubah. Error memerlukan tindakan Muat ulang/Coba lagi; tidak ada retry otomatis tanpa batas. Riwayat Penerimaan juga dijeda saat halaman detailnya dibuka.

Notifikasi dimuat saat komponen dibuka pertama kali, dropdown dibuka, halaman/pagination berubah, atau pengguna menekan Muat ulang; tidak ada polling latar setiap 30 detik. Perubahan dari pengguna lain ketika halaman sedang diam terlihat setelah refresh manual atau membuka ulang halaman. Timer jam WIB dan cooldown OTP hanya memperbarui tampilan, tanpa request API.

## Perintah

Jalankan dari direktori repository frontend.

| Perintah            | Kegunaan                                 |
| ------------------- | ---------------------------------------- |
| `npm ci`            | Menginstal dependency sesuai lockfile    |
| `npm run dev`       | Menjalankan server pengembangan          |
| `npm run typecheck` | Memeriksa TypeScript                     |
| `npm run build`     | Membuat build produksi                   |
| `npm start`         | Menjalankan hasil build produksi         |
| `npm run test:e2e`  | Menjalankan pengujian browser Playwright |

Aset PDF.js disiapkan otomatis oleh `predev` dan `prebuild`, sehingga folder vendor hasil generate tidak perlu disimpan di Git. Alternatif untuk pengguna Windows: `powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1`.

## Pengujian browser

Pengujian membuat pengguna, upload, dan transaksi uji. Gunakan fixture terisolasi berikut dengan repository backend di `../backend` dan `.env` backend yang sudah disiapkan. Fixture menggunakan schema MySQL sementara dan respons Accurate tiruan. Siapkan `TEST_DATABASE_URL` pada environment backend atau `.env.test.local` privat sebelum menjalankan fixture; database aplikasi tidak dipakai untuk pengujian.

1. Dari backend, buat template anonim dan jalankan fixture API:

   ```powershell
   npx tsx scripts/prepare-import-assets.ts
   $env:ACCURATE_MOCK_SERVER = 'true'
   npx tsx test/helpers/browser-server.ts
   ```

2. Dari frontend, jalankan web pengujian di terminal lain:

   ```powershell
   $env:NEXT_PUBLIC_API_URL = 'http://localhost:4001'
   npm run dev -- --port 3001
   ```

3. Dari frontend, jalankan Playwright di terminal lain:

   ```powershell
   $env:NEXT_PUBLIC_API_URL = 'http://localhost:4001'
   $env:PLAYWRIGHT_BASE_URL = 'http://localhost:3001'
   $env:ACCURATE_MOCK_SERVER = 'true'
   npm run test:e2e
   ```

Template Excel dan screenshot pengujian saat ini ditulis ke `../../docs/` relatif terhadap frontend/backend. Folder tersebut dibuat sebagai artefak lokal di luar kedua repository. Sejumlah skenario memerlukan kondisi awal fixture tertentu; restart fixture ketika menjalankan skenario yang memerlukan konfigurasi awal yang bersih.

Untuk pengujian tambah customer, aktifkan `$env:CUSTOMER_CREATION_FIXTURE = 'true'` pada terminal fixture backend dan terminal Playwright, lalu jalankan `npx playwright test tests/e2e/accurate-customer.spec.ts`. Gunakan fixture baru; jalankan pengujian alur faktur lainnya dengan fixture default tanpa flag ini.

## Struktur project

```text
src/
  app/                Routing, layout, dan global styles
  features/           UI, hooks, services, dan types per fitur
  components/ui/      Komponen dasar yang digunakan bersama
  components/common/  Shell workspace dan navigasi
  hooks/              Hooks lintas fitur
  lib/                Konfigurasi library dan helper
  services/           HTTP client bersama
  styles/             Token tema dan styling workspace
  types/              Kontrak bersama
tests/                Pengujian browser dan fixture
public/               Aset web publik
assets/               Sumber aset branding
scripts/              Persiapan aset dan utilitas lokal
```

Gunakan komponen bersama dan token tema yang sudah tersedia. Warna utama intgrte adalah `#5343df` di mode terang maupun gelap; aksen kuning `#ffde59`.

## Git Rules

Buat branch untuk setiap perubahan, jalankan pemeriksaan yang relevan, lalu ajukan pull request dengan ringkasan perubahan dan hasil validasi. Pertahankan `package-lock.json` agar instalasi tim konsisten. Gunakan `.env.example` sebagai acuan konfigurasi; nilai environment lokal, data upload, dan hasil build/testing tidak disertakan dalam commit.
