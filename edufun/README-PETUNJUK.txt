EDUFUN — PAKET FONDASI V1
========================

Isi:
- index.html : halaman pendaftaran peserta
- admin.html : dashboard admin dasar
- Code.gs    : backend Google Apps Script mandiri

PENTING:
Paket ini adalah fondasi V1 untuk diuji, belum merupakan deployment aktif. Jangan tempel Code.gs ini ke Code.gs utama MamIsApps. Buat project Apps Script BARU khusus EduFun.

LANGKAH PEMASANGAN
1. Buat Google Spreadsheet baru bernama Database EduFun.
2. Buka Extensions > Apps Script.
3. Tempel isi file edufun/Code.gs ke project baru.
4. Jalankan setupEduFun() satu kali.
5. Jalankan setupAdminEduFun() satu kali. Catat password awal yang ditampilkan, lalu ganti password sebelum dipakai publik.
6. Deploy > New deployment > Web app; Execute as: Me; Who has access: Anyone.
7. Salin URL /exec hasil deployment.
8. Di edufun/index.html dan edufun/admin.html, ganti PASTE_APPS_SCRIPT_WEB_APP_URL_HERE dengan URL /exec.
9. Commit folder edufun ke repository MamIsApps.
10. Buka https://sanggarmamis.mytije.com/edufun/ dan /edufun/admin.html

KONFIGURASI YANG BELUM DIISI
- QRIS Sanggar: upload setelah admin login; untuk versi ini penyimpanan QRIS di Drive dibuat dasar.
- Rekening transfer: isi melalui menu pengaturan admin.
- Nomor WhatsApp/email: diisi peserta saat mendaftar (minimal salah satu).

CATATAN PENTING V1
- Pendaftaran dan status pembayaran dicatat ke Spreadsheet.
- Pembayaran tidak otomatis terdeteksi dari QRIS statis. Admin wajib verifikasi.
- Foto Twibbon membutuhkan file twibbon.png transparan di folder edufun. Letakkan frame final yang sudah disetujui dengan nama persis twibbon.png.
- Foto peserta dan hasil Twibbon tersimpan di Drive setelah proses unggah.
- Modul sertifikat saat ini menghasilkan HTML dasar; tahap desain berikutnya perlu mengganti template dengan desain sertifikat hijau final dan QR verifikasi visual.
- Fitur kirim WA/email otomatis belum diaktifkan. Untuk WhatsApp, gunakan link wa.me/manual; email dapat diintegrasikan di tahap berikutnya.
- Keamanan: ganti password awal, batasi akses spreadsheet/Drive, dan lakukan uji coba dengan data dummy sebelum pendaftaran dibuka.

INTEGRASI MENU DI WEBSITE UTAMA
Tambahkan tautan berikut di menu/halaman utama tanpa mengganti file utama:
<a href="edufun/">EduFun</a>

UPDATE V2 — PERBAIKAN & ASET
- twibbon.png: frame EduFun dengan area foto tengah diproses transparan.
- certificate-template.png: desain sertifikat hijau yang diberikan pengelola (template referensi).
- Halaman pendaftaran menampilkan instruksi Cash/Transfer/QRIS setelah metode dipilih.
- Admin menggunakan pemilihan peserta melalui tombol data-pick agar aksi Pilih lebih stabil.
- Admin dapat menyimpan rekening dan QRIS, lalu halaman pendaftaran membaca informasi tersebut.
- Setelah memperbarui Code.gs, lakukan Deploy > Manage deployments > Edit > New version > Deploy.
- Setelah memperbarui file HTML/PNG di GitHub Pages, tunggu deployment selesai lalu hard refresh (Ctrl+F5).

CATATAN:
Template sertifikat PNG saat ini adalah contoh visual yang masih memuat nama contoh Kinanthi Prameswari TJ dan QR contoh. Jangan gunakan langsung untuk peserta lain. Generator sertifikat personal dengan QR verifikasi unik masih perlu tahap implementasi lanjutan.
