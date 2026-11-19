EDUFUN V2.4 — PEMBAYARAN STATIS DI CODE.GS
=============================================

ISI PAKET:
- edufun/index.html : pendaftaran peserta, menampilkan detail transfer dan QRIS
- edufun/admin.html : dashboard admin; tidak ada form pengaturan pembayaran
- edufun/Code.gs : backend EduFun; konfigurasi bank dan QRIS sudah ditetapkan di EF_CFG
- edufun/twibbon.png : frame Twibbon
- edufun/certificate-template.png : template visual sertifikat

KONFIGURASI PEMBAYARAN YANG SUDAH DIMASUKKAN:
Bank: BCA
No. rekening: 8690929504
Atas nama: Euis Gartina Ayu Sarie
QRIS Drive file ID: 1Bl56Wl3X2PbHUeqhBc2s-JNP_ru3_ggJ
URL QRIS: https://drive.google.com/uc?export=view&id=1Bl56Wl3X2PbHUeqhBc2s-JNP_ru3_ggJ

URL WEB APP:
https://script.google.com/macros/s/AKfycbye6QyXh8jA_EGi82oArNAhuY2lPq6kLE07_NVsrdR0moE0mr3eAt_JYNlNBJtPT2ISrw/exec

CARA UPDATE YANG BENAR — PENTING:
1. Di GitHub repository MamIsApps, buka folder edufun.
2. Ganti HANYA file edufun/index.html dan edufun/admin.html dengan file yang ada di folder edufun ZIP ini.
3. Upload edufun/twibbon.png dan edufun/certificate-template.png ke folder edufun bila belum ada.
4. JANGAN upload Code.gs ke GitHub sebagai admin.html atau index.html.
5. Buka editor Google Apps Script project "edufun project".
6. Di panel kiri Apps Script, buka file Code.gs.
7. Pilih seluruh isi Code.gs lama, ganti dengan isi file edufun/Code.gs dari ZIP ini, lalu Save.
8. Deploy > Manage deployments > Edit > New version > Deploy.
9. Tunggu GitHub Pages selesai, lalu hard refresh halaman.

JANGAN:
- Jangan menempel isi Code.gs ke file HTML di GitHub.
- Jangan mengganti index.html utama root repository.
- Jangan menghapus Spreadsheet atau tab PESERTA.
- Jangan mengubah Script Properties admin/EF_SSID.

PENTING UNTUK QRIS:
File Drive harus disetel General access: Anyone with the link / Viewer agar gambar dapat tampil untuk calon peserta. Jika QRIS tidak muncul, buka link Drive dan pastikan izin berbagi publik sudah aktif.

Pembayaran:
- Cash: peserta membayar langsung ke Sanggar.
- Transfer: detail BCA ditampilkan saat metode Transfer dipilih.
- QRIS: gambar QRIS ditampilkan saat metode QRIS dipilih.
Verifikasi status pembayaran tetap dilakukan admin dari dashboard peserta.

PENTING — PEMISAHAN FILE:
- admin.html dan index.html hanya untuk folder GitHub MamIsApps/edufun.
- Code.gs hanya ditempel ke editor Google Apps Script, file bernama Code.gs.
- Jangan pernah menempel isi Code.gs ke admin.html atau index.html.
- Di V2.4 admin tidak lagi memiliki form pengaturan pembayaran. Nama bank dan QRIS dibaca dari konstanta EF_CFG pada Code.gs.


UPDATE V2.5 — QRIS & AKSI PESERTA
- URL QRIS diganti ke endpoint thumbnail Google Drive untuk tampilan gambar.
- Pastikan file Drive QRIS memiliki akses General access: Anyone with the link / Viewer.
- Tabel peserta kini memiliki tombol Pilih, Edit, dan Hapus.
- Edit mengubah Nama, Kelas, WhatsApp, Email, dan Metode Bayar.
- Hapus menghapus baris peserta dari sheet PESERTA setelah konfirmasi.
- Backend menambah action editParticipant dan deleteParticipant.
- Ganti folder edufun di GitHub; perbarui Code.gs di editor Apps Script; Deploy New version.
- Jangan menempel Code.gs ke file HTML.
