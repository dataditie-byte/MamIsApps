/**
 * SANGGAR BELAJAR MAM IS LEARNING HUB
 * Backend Google Apps Script - Versi Final Dasar
 *
 * LANGKAH AWAL:
 * 1. Buat/buka Google Spreadsheet.
 * 2. Extensions > Apps Script.
 * 3. Tempel seluruh kode ini ke Code.gs.
 * 4. Isi SPREADSHEET_ID jika script berdiri sendiri.
 *    Jika script terikat pada Spreadsheet, boleh dikosongkan.
 * 5. Jalankan setupDatabase() satu kali dari editor.
 * 6. Jalankan buatAdminAwal() satu kali.
 * 7. Deploy > New deployment > Web app:
 *    Execute as: Me
 *    Who has access: Anyone
 */

const BIAYA_PENDAFTARAN_SISWA_BARU = 30000;

const CONFIG = {
  SPREADSHEET_ID: '',
  API_KEY: 'MAMIS-2026',
  APP_NAME: 'Sanggar Belajar Mam Is Learning Hub',
  SESSION_HOURS: 12,
  TIMEZONE: 'Asia/Jakarta',
  ADMIN_USERNAME: 'admin',
  ADMIN_PIN_AWAL: '123456'
};

const SCHEMA = {
  Siswa: [
    'ID Siswa','Nama Siswa','Jenjang','Nama Orang Tua','No WA',
    'Alamat','Status Aktif','Tanggal Daftar'
  ],
  Pengajar: [
    'ID Pengajar','Nama Pengajar','No WA','Alamat','Status Aktif'
  ],
  Kelas: [
    'ID Kelas','Nama Kelas','Jenjang','Kategori','Deskripsi Program','Materi Program',
    'ID Pengajar','Nama Pengajar','Biaya Bulanan','Status Kelas','Jadwal'
  ],
  Peserta: [
    'ID Peserta','ID Siswa','Nama Siswa','ID Kelas','Nama Kelas',
    'Tanggal Masuk','Status Aktif'
  ],
  Absensi: [
    'ID Absensi','Tanggal','ID Kelas','Nama Kelas','ID Siswa',
    'Nama Siswa','Kehadiran','Keterangan','Waktu Input'
  ],
  Pembayaran: [
    'ID Pembayaran','Tanggal Bayar','Bulan Pembayaran','ID Siswa',
    'Nama Siswa','ID Kelas','Nama Kelas','Tagihan','Dibayar',
    'Sisa','Status Pembayaran','Metode Bayar','Keterangan','Riwayat Pelunasan'
  ],
  Pendaftaran: [
    'ID Pendaftaran','Tanggal','Nama Siswa','Jenis Kelamin','Tempat Lahir',
    'Tanggal Lahir','Jenjang','Kelas Sekolah','Nama Sekolah',
    'Nama Orang Tua','No WA','Alamat','ID Kelas','Program Dipilih',
    'Jadwal Dipilih','Catatan','Status Pendaftaran','ID Siswa','Diproses Oleh'
  ],
  Akun: [
    'ID Akun','ID Siswa','Nama Siswa','Username','PIN Hash','Peran',
    'Status Akun','Login Terakhir','Token Aktif','Token Kedaluwarsa'
  ],
  Materi: [
    'ID Materi','Judul Materi','Jenjang','ID Kelas','Nama Kelas','Kategori',
    'Jenis Materi','Deskripsi','Link Materi','Urutan','Status Materi',
    'Tanggal Terbit','Kode Akses'
  ],
  Akses_Materi: [
    'ID Akses','ID Siswa','ID Materi','Status Akses','Tanggal Dibuka','Progress'
  ],
  Hasil_Latihan: [
    'ID Hasil','Tanggal','ID Siswa','Nama Siswa','ID Materi',
    'Judul Latihan','Nilai','Jawaban Benar','Jumlah Soal','Durasi','Status'
  ],
  Pengumuman: [
    'ID Pengumuman','Tanggal','Judul','Isi','Target','ID Kelas','Status'
  ],
  Aktivitas_Login: [
    'ID Aktivitas','Waktu','ID Akun','ID Siswa','Username','Peran','Status','Perangkat'
  ]
};

/* =========================
   ENTRY POINT WEB APP
========================= */

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || 'ping').trim();
    const result = routeAction_(action, p);
    return output_(result, p.callback);
  } catch (err) {
    return output_({
      status: false,
      message: err && err.message ? err.message : String(err)
    }, e && e.parameter ? e.parameter.callback : '');
  }
}

function doPost(e) {
  let requestId = '';
  let origin = '*';

  try {
    const params = (e && e.parameter) || {};
    requestId = String(params.requestId || '');
    origin = String(params.origin || '*');

    let body = {};
    const raw = e && e.postData ? e.postData.contents : '';

    // Mendukung JSON POST dan form POST dari GitHub Pages.
    if (params.action) {
      body = params;
    } else {
      try {
        body = JSON.parse(raw || '{}');
      } catch (jsonErr) {
        body = params;
      }
    }

    const action = String(body.action || 'ping').trim();
    const result = routeAction_(action, body);

    // Untuk upload dari GitHub melalui iframe.
    if (requestId) {
      const payload = Object.assign({}, result, {
        source: 'MAMIS_APPS_SCRIPT',
        requestId: requestId
      });

      const safeJson = JSON.stringify(payload)
        .replace(/</g, '\u003c')
        .replace(/>/g, '\u003e')
        .replace(/&/g, '\u0026');

      const safeOrigin = JSON.stringify(origin || '*');

      return HtmlService.createHtmlOutput(
        '<!doctype html><html><body><script>' +
        'parent.postMessage(' + safeJson + ',"*");' +
        '</script></body></html>'
      ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const failure = {
      status: false,
      message: err && err.message ? err.message : String(err),
      source: 'MAMIS_APPS_SCRIPT',
      requestId: requestId
    };

    if (requestId) {
      const safeJson = JSON.stringify(failure)
        .replace(/</g, '\u003c')
        .replace(/>/g, '\u003e')
        .replace(/&/g, '\u0026');

      const safeOrigin = JSON.stringify(origin || '*');

      return HtmlService.createHtmlOutput(
        '<!doctype html><html><body><script>' +
        'parent.postMessage(' + safeJson + ',"*");' +
        '</script></body></html>'
      ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return ContentService
      .createTextOutput(JSON.stringify(failure))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function routeAction_(action, p) {
  const publicActions = [
    'ping','getPublicData','addPendaftaran','login','portalSiswa'
  ];

  if (!publicActions.includes(action)) {
    validateApiKey_(p.key);
  }

  switch (action) {
    case 'ping': return {
      status: true,
      app: CONFIG.APP_NAME,
      time: nowText_()
    };

    case 'setupDatabase': return setupDatabase();
    case 'bootstrap': return bootstrap_();

    // Siswa
    case 'addSiswa': return addSiswa_(parseData_(p.data));
    case 'updateSiswa': return updateSiswa_(parseData_(p.data));
    case 'deleteSiswa': return deleteById_('Siswa','ID Siswa',p.id,'Siswa');

    // Pengajar
    case 'addPengajar': return addPengajar_(parseData_(p.data));
    case 'updatePengajar': return updatePengajar_(parseData_(p.data));
    case 'deletePengajar': return deleteById_('Pengajar','ID Pengajar',p.id,'Pengajar');

    // Kelas
    case 'addKelas': return addKelas_(parseData_(p.data));
    case 'updateKelas': return updateKelas_(parseData_(p.data));
    case 'deleteKelas': return deleteById_('Kelas','ID Kelas',p.id,'Kelas');

    // Peserta
    case 'addPeserta': return addPeserta_(parseData_(p.data));
    case 'updatePeserta': return updatePeserta_(parseData_(p.data));
    case 'deletePeserta': return deleteById_('Peserta','ID Peserta',p.id,'Peserta');
    case 'getPesertaByKelas': return getPesertaByKelas_(p.idKelas);

    // Absensi
    case 'addAbsensiBatch': return addAbsensiBatch_(parseData_(p.data));

    // Pembayaran
    case 'getTagihanSiswa': return getTagihanSiswa_(p.idSiswa,p.bulan);
    case 'addPembayaran': return addPembayaran_(parseData_(p.data));
    case 'addPelunasan': return addPelunasan_(parseData_(p.data));

    // Publik dan pendaftaran
    case 'getPublicData': return getPublicData_();
    case 'addPendaftaran': return addPendaftaran_(parseData_(p.data));
    case 'updateStatusPendaftaran':
      return updateStatusPendaftaran_(parseData_(p.data));
    case 'terimaPendaftaran':
      return terimaPendaftaran_(parseData_(p.data));
    case 'hapusPendaftaran':
      return hapusPendaftaran_(parseData_(p.data));
    case 'arsipkanPendaftaran':
      return arsipkanPendaftaran_(parseData_(p.data));
    case 'pulihkanPendaftaran':
      return pulihkanPendaftaran_(parseData_(p.data));
    case 'hapusPermanenPendaftaran':
      return hapusPermanenPendaftaran_(parseData_(p.data));

    // Akun dan login
    case 'login': return login_(parseData_(p.data), p);
    case 'logout': return logout_(p.token);
    case 'buatAkunSiswa': return buatAkunSiswa_(parseData_(p.data));
    case 'resetPin': return resetPin_(parseData_(p.data));
    case 'simpanAkunPengguna': return simpanAkunPengguna_(parseData_(p.data));
    case 'buatAdminAwal': return buatAdminAwal();

    // Portal siswa
    case 'portalSiswa': return portalSiswa_(p.token || parseData_(p.data).token);
    case 'bukaMateri': return bukaMateri_(parseData_(p.data), p.token);
    case 'simpanHasilLatihan': return simpanHasilLatihan_(parseData_(p.data), p.token);

    // Materi
    case 'addMateri': return addMateri_(parseData_(p.data));
    case 'updateMateri': return updateMateri_(parseData_(p.data));
    case 'deleteMateri': return deleteById_('Materi','ID Materi',p.id,'Materi');

    // Pengumuman
    case 'addPengumuman': return addPengumuman_(parseData_(p.data));
    case 'updatePengumuman': return updatePengumuman_(parseData_(p.data));
    case 'deletePengumuman':
      return deleteById_('Pengumuman','ID Pengumuman',p.id,'Pengumuman');

case 'getCBTBootstrap': return getCBTBootstrap_();
case 'addSoal': return addSoal_(parseData_(p.data));
case 'updateSoal': return updateSoal_(parseData_(p.data));
case 'deleteSoal':
  return deleteById_('Bank_Soal','ID Soal',p.id,'Soal');

case 'addPaketCBT': return addPaketCBT_(parseData_(p.data));
case 'updatePaketCBT': return updatePaketCBT_(parseData_(p.data));
case 'deletePaketCBT': return deletePaketCBT_(p.id);
case 'setSoalPaket': return setSoalPaket_(parseData_(p.data));

case 'getPaketSiswa': return getPaketSiswa_(p.token);
case 'mulaiCBT': return mulaiCBT_(parseData_(p.data),p.token);
case 'getSesiCBT': return getSesiCBT_(p.idSesi,p.token);
case 'simpanJawabanCBT':
  return simpanJawabanCBT_(parseData_(p.data),p.token);
case 'selesaiCBT': return selesaiCBT_(parseData_(p.data),p.token);
case 'hasilCBT': return hasilCBT_(p.idSesi,p.token);
    default:
      return {status:false,message:'Action tidak dikenal: '+action};
  }
}

/* =========================
   SETUP DATABASE
========================= */

function setupDatabase() {
  const ss = getSS_();

  Object.keys(SCHEMA).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    const headers = SCHEMA[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    } else {
      const current = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length))
        .getValues()[0];
      headers.forEach((h,i) => {
        if (!current.includes(h)) sh.getRange(1,sh.getLastColumn()+1).setValue(h);
      });
    }

    sh.setFrozenRows(1);
    sh.getRange(1,1,1,sh.getLastColumn())
      .setFontWeight('bold')
      .setBackground('#1f4e79')
      .setFontColor('#ffffff');

    sh.autoResizeColumns(1,sh.getLastColumn());
  });

  PropertiesService.getScriptProperties().setProperty('MAMIS_SETUP','OK');

  return {
    status:true,
    message:'Database Sanggar Belajar Mam Is berhasil disiapkan.',
    sheets:Object.keys(SCHEMA)
  };
}

function buatAdminAwal() {
  ensureSetup_();
  const akun = getRows_('Akun');
  const exists = akun.find(r =>
    String(r['Username']).toLowerCase() === CONFIG.ADMIN_USERNAME.toLowerCase()
  );

  if (exists) {
    return {status:true,message:'Akun admin sudah tersedia.',username:exists['Username']};
  }

  const idAkun = nextId_('AKN');
  appendObject_('Akun',{
    'ID Akun':idAkun,
    'ID Siswa':'ADMIN',
    'Nama Siswa':'Administrator Sanggar Belajar Mam Is',
    'Username':CONFIG.ADMIN_USERNAME,
    'PIN Hash':hash_(CONFIG.ADMIN_PIN_AWAL),
    'Peran':'Admin',
    'Status Akun':'Aktif',
    'Login Terakhir':'',
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  });

  return {
    status:true,
    message:'Admin awal berhasil dibuat. Segera ganti PIN setelah login.',
    username:CONFIG.ADMIN_USERNAME,
    pinAwal:CONFIG.ADMIN_PIN_AWAL
  };
}

/* =========================
   BOOTSTRAP ADMIN
========================= */

function bootstrap_() {
  ensureSetup_();

  const siswa = getRows_('Siswa');
  const pengajar = getRows_('Pengajar');
  const kelas = getRows_('Kelas');
  const peserta = getRows_('Peserta');
  const pembayaran = getRows_('Pembayaran');
  const absensi = getRows_('Absensi');
  const pendaftaran = getRows_('Pendaftaran');
  const akun = sanitizeAkun_(getRows_('Akun'));
  const materi = getRows_('Materi');
  const hasil = getRows_('Hasil_Latihan');
  const pengumuman = getRows_('Pengumuman');

  const thisMonth = Utilities.formatDate(new Date(),CONFIG.TIMEZONE,'yyyy-MM');
  const pembayaranBulanIni = pembayaran.filter(r =>
    normalizeMonth_(r['Bulan Pembayaran']) === thisMonth
  );

  const totalBayar = pembayaranBulanIni.reduce((n,r) => n + num_(r['Dibayar']),0);
  const totalTunggakan = pembayaran.reduce((n,r) => n + num_(r['Sisa']),0);

  return {
    status:true,
    siswa,
    pengajar,
    kelas,
    peserta,
    pembayaran,
    absensi,
    pendaftaran,
    akun,
    materi,
    hasil,
    pengumuman,
    summary:{
      jumlahSiswaAktif:siswa.filter(r=>isActive_(r['Status Aktif'])).length,
      jumlahPengajarAktif:pengajar.filter(r=>isActive_(r['Status Aktif'])).length,
      jumlahKelasAktif:kelas.filter(r=>isActive_(r['Status Kelas'])).length,
      jumlahPesertaKelas:peserta.filter(r=>isActive_(r['Status Aktif'])).length,
      pendaftaranBaru:pendaftaran.filter(r =>
        String(r['Status Pendaftaran']).toLowerCase()==='baru'
      ).length,
      jumlahMateriAktif:materi.filter(r=>isActive_(r['Status Materi'])).length,
      totalPembayaranBulanIni:totalBayar,
      totalTunggakan:totalTunggakan
    }
  };
}

/* =========================
   CRUD SISWA
========================= */

function addSiswa_(d) {
  required_(d,['namaSiswa','jenjang','namaOrtu','noWa']);

  const id = nextId_('SIS');
  appendObject_('Siswa',{
    'ID Siswa':id,
    'Nama Siswa':d.namaSiswa,
    'Jenjang':d.jenjang,
    'Nama Orang Tua':d.namaOrtu,
    'No WA':d.noWa,
    'Alamat':d.alamat || '',
    'Status Aktif':d.statusAktif || 'Aktif',
    'Tanggal Daftar':todayText_()
  });

  return {status:true,message:'Siswa berhasil disimpan.',idSiswa:id};
}

function updateSiswa_(d) {
  required_(d,['idSiswa','namaSiswa']);
  updateById_('Siswa','ID Siswa',d.idSiswa,{
    'Nama Siswa':d.namaSiswa,
    'Jenjang':d.jenjang || '',
    'Nama Orang Tua':d.namaOrtu || '',
    'No WA':d.noWa || '',
    'Alamat':d.alamat || '',
    'Status Aktif':d.statusAktif || 'Aktif'
  });
  return {status:true,message:'Data siswa berhasil diperbarui.'};
}

/* =========================
   CRUD PENGAJAR
========================= */

function addPengajar_(d) {
  required_(d,['namaPengajar']);
  const id = nextId_('PGR');
  appendObject_('Pengajar',{
    'ID Pengajar':id,
    'Nama Pengajar':d.namaPengajar,
    'No WA':d.noWa || '',
    'Alamat':d.alamat || '',
    'Status Aktif':d.statusAktif || 'Aktif'
  });
  return {status:true,message:'Pengajar berhasil disimpan.',idPengajar:id};
}

function updatePengajar_(d) {
  required_(d,['idPengajar','namaPengajar']);
  updateById_('Pengajar','ID Pengajar',d.idPengajar,{
    'Nama Pengajar':d.namaPengajar,
    'No WA':d.noWa || '',
    'Alamat':d.alamat || '',
    'Status Aktif':d.statusAktif || 'Aktif'
  });
  return {status:true,message:'Data pengajar berhasil diperbarui.'};
}

/* =========================
   CRUD KELAS
========================= */

function addKelas_(d) {
  required_(d,['namaKelas','jenjang']);
  const id = nextId_('KLS');
  appendObject_('Kelas',{
    'ID Kelas':id,
    'Nama Kelas':d.namaKelas,
    'Jenjang':d.jenjang,
    'Kategori':d.kategori || '',
    'Deskripsi Program':d.deskripsiProgram || '',
    'Materi Program':d.materiProgram || '',
    'ID Pengajar':d.idPengajar || '',
    'Nama Pengajar':d.namaPengajar || '',
    'Biaya Bulanan':num_(d.biayaBulanan),
    'Status Kelas':d.statusKelas || 'Aktif',
    'Jadwal':d.jadwal || ''
  });
  return {status:true,message:'Program belajar berhasil disimpan.',idKelas:id};
}

function updateKelas_(d) {
  required_(d,['idKelas','namaKelas']);
  updateById_('Kelas','ID Kelas',d.idKelas,{
    'Nama Kelas':d.namaKelas,
    'Jenjang':d.jenjang || '',
    'Kategori':d.kategori || '',
    'Deskripsi Program':d.deskripsiProgram || '',
    'Materi Program':d.materiProgram || '',
    'ID Pengajar':d.idPengajar || '',
    'Nama Pengajar':d.namaPengajar || '',
    'Biaya Bulanan':num_(d.biayaBulanan),
    'Status Kelas':d.statusKelas || 'Aktif',
    'Jadwal':d.jadwal || ''
  });
  return {status:true,message:'Program belajar berhasil diperbarui.'};
}

/* =========================
   PESERTA KELAS
========================= */

function addPeserta_(d) {
  required_(d,['idSiswa','namaSiswa','idKelas','namaKelas']);

  const rows = getRows_('Peserta');
  const duplicate = rows.find(r =>
    String(r['ID Siswa'])===String(d.idSiswa) &&
    String(r['ID Kelas'])===String(d.idKelas) &&
    isActive_(r['Status Aktif'])
  );

  if (duplicate) {
    return {status:false,message:'Siswa sudah terdaftar aktif di kelas tersebut.'};
  }

  const id = nextId_('PST');
  appendObject_('Peserta',{
    'ID Peserta':id,
    'ID Siswa':d.idSiswa,
    'Nama Siswa':d.namaSiswa,
    'ID Kelas':d.idKelas,
    'Nama Kelas':d.namaKelas,
    'Tanggal Masuk':d.tanggalMasuk || todayText_(),
    'Status Aktif':d.statusAktif || 'Aktif'
  });

  return {status:true,message:'Peserta kelas berhasil disimpan.',idPeserta:id};
}

function updatePeserta_(d) {
  required_(d,['idPeserta']);
  updateById_('Peserta','ID Peserta',d.idPeserta,{
    'ID Siswa':d.idSiswa || '',
    'Nama Siswa':d.namaSiswa || '',
    'ID Kelas':d.idKelas || '',
    'Nama Kelas':d.namaKelas || '',
    'Tanggal Masuk':d.tanggalMasuk || todayText_(),
    'Status Aktif':d.statusAktif || 'Aktif'
  });
  return {status:true,message:'Peserta kelas berhasil diperbarui.'};
}

function getPesertaByKelas_(idKelas) {
  return getRows_('Peserta').filter(r =>
    String(r['ID Kelas'])===String(idKelas) && isActive_(r['Status Aktif'])
  );
}

/* =========================
   ABSENSI
========================= */

function addAbsensiBatch_(d) {
  required_(d,['tanggal','idKelas','namaKelas']);
  const items = Array.isArray(d.items) ? d.items : [];
  if (!items.length) return {status:false,message:'Tidak ada peserta untuk disimpan.'};

  const rows = items.map(it => ({
    'ID Absensi':nextId_('ABS'),
    'Tanggal':d.tanggal,
    'ID Kelas':d.idKelas,
    'Nama Kelas':d.namaKelas,
    'ID Siswa':it.idSiswa,
    'Nama Siswa':it.namaSiswa,
    'Kehadiran':it.kehadiran || 'Hadir',
    'Keterangan':it.keterangan || '',
    'Waktu Input':nowText_()
  }));

  appendObjects_('Absensi',rows);
  return {status:true,message:rows.length+' data absensi berhasil disimpan.'};
}

/* =========================
   PEMBAYARAN
========================= */

function getTagihanSiswa_(idSiswa, bulan) {
  const peserta = getRows_('Peserta').filter(r =>
    String(r['ID Siswa'])===String(idSiswa) && isActive_(r['Status Aktif'])
  );
  const kelas = getRows_('Kelas');
  const siswa = getRows_('Siswa').find(r => String(r['ID Siswa'])===String(idSiswa)) || {};

  const rincian = peserta.map(p => {
    const k = kelas.find(x => String(x['ID Kelas'])===String(p['ID Kelas'])) || {};
    return {
      idKelas:p['ID Kelas'],
      namaKelas:p['Nama Kelas'],
      biaya:num_(k['Biaya Bulanan'])
    };
  });

  const totalTagihan = rincian.reduce((n,x)=>n+x.biaya,0);
  const month = normalizeMonth_(bulan || todayText_().slice(0,7));
  const pembayaran = getRows_('Pembayaran').filter(r =>
    String(r['ID Siswa'])===String(idSiswa) &&
    normalizeMonth_(r['Bulan Pembayaran'])===month
  );
  const totalDibayar = pembayaran.reduce((n,r)=>n+num_(r['Dibayar']),0);

  return {
    status:true,
    idSiswa,
    namaSiswa:siswa['Nama Siswa'] || '',
    bulan:month,
    kelas:rincian,
    jumlahKelas:rincian.length,
    totalTagihan,
    totalDibayar,
    sisa:Math.max(totalTagihan-totalDibayar,0)
  };
}

function addPembayaran_(d) {
  required_(d,['tanggalBayar','bulanPembayaran','idSiswa','namaSiswa']);

  const tagihan = num_(d.tagihan);
  const dibayar = num_(d.dibayar);
  const sisa = Math.max(tagihan-dibayar,0);
  const statusBayar = sisa<=0 ? 'Lunas' : (dibayar>0 ? 'Cicilan' : 'Belum Bayar');
  const id = nextId_('BYR');

  appendObject_('Pembayaran',{
    'ID Pembayaran':id,
    'Tanggal Bayar':d.tanggalBayar,
    'Bulan Pembayaran':normalizeMonth_(d.bulanPembayaran),
    'ID Siswa':d.idSiswa,
    'Nama Siswa':d.namaSiswa,
    'ID Kelas':d.idKelas || 'MULTI',
    'Nama Kelas':d.namaKelas || 'Semua Kelas Aktif',
    'Tagihan':tagihan,
    'Dibayar':dibayar,
    'Sisa':sisa,
    'Status Pembayaran':statusBayar,
    'Metode Bayar':d.metodeBayar || '',
    'Keterangan':d.keterangan || '',
    'Riwayat Pelunasan':''
  });

  return {
    status:true,
    message:'Pembayaran berhasil disimpan.',
    idPembayaran:id,
    statusPembayaran:statusBayar,
    sisa
  };
}

function addPelunasan_(d) {
  required_(d,['idPembayaran','tanggalBayar','dibayar']);
  const rows = getRows_('Pembayaran');
  const row = rows.find(r => String(r['ID Pembayaran'])===String(d.idPembayaran));
  if (!row) return {status:false,message:'Data pembayaran tidak ditemukan.'};

  const tambahan = num_(d.dibayar);
  const dibayarBaru = num_(row['Dibayar']) + tambahan;
  const sisaBaru = Math.max(num_(row['Tagihan'])-dibayarBaru,0);
  const statusBayar = sisaBaru<=0 ? 'Lunas' : 'Cicilan';

  const riwayatLama = String(row['Riwayat Pelunasan'] || '');
  const catatan = [
    d.tanggalBayar,
    tambahan,
    d.metodeBayar || '',
    d.keterangan || ''
  ].join(' | ');

  updateById_('Pembayaran','ID Pembayaran',d.idPembayaran,{
    'Tanggal Bayar':d.tanggalBayar,
    'Dibayar':dibayarBaru,
    'Sisa':sisaBaru,
    'Status Pembayaran':statusBayar,
    'Metode Bayar':d.metodeBayar || row['Metode Bayar'],
    'Keterangan':d.keterangan || row['Keterangan'],
    'Riwayat Pelunasan':riwayatLama ? riwayatLama+'\n'+catatan : catatan
  });

  return {
    status:true,
    message:'Pelunasan berhasil disimpan.',
    statusPembayaran:statusBayar,
    sisa:sisaBaru
  };
}

/* =========================
   PENDAFTARAN PUBLIK
========================= */

function getPublicData_() {
  ensureSetup_();
  const kelas = getRows_('Kelas')
    .filter(r=>isActive_(r['Status Kelas']))
    .map(r=>({
      idKelas:r['ID Kelas'],
      namaKelas:r['Nama Kelas'],
      jenjang:r['Jenjang'],
      kategori:r['Kategori'],
      deskripsi:r['Deskripsi Program'] || '',
      materi:r['Materi Program'] || '',
      biaya:num_(r['Biaya Bulanan']),
      jadwal:r['Jadwal'] || ''
    }));

  const pengajar = getRows_('Pengajar')
    .filter(r=>isActive_(r['Status Aktif']))
    .map(r=>({
      nama:r['Nama Pengajar']
    }));

  return {status:true,kelas,pengajar};
}

function addPendaftaran_(d) {
  required_(d,['namaSiswa','jenjang','namaOrtu','noWa']);
  const kelas = getRows_('Kelas').find(r =>
    String(r['ID Kelas'])===String(d.idKelas || '')
  ) || {};

  const id = nextId_('DFT');
  appendObject_('Pendaftaran',{
    'ID Pendaftaran':id,
    'Tanggal':nowText_(),
    'Nama Siswa':d.namaSiswa,
    'Jenis Kelamin':d.jenisKelamin || '',
    'Tempat Lahir':d.tempatLahir || '',
    'Tanggal Lahir':d.tanggalLahir || '',
    'Jenjang':d.jenjang,
    'Kelas Sekolah':d.kelasSekolah || '',
    'Nama Sekolah':d.namaSekolah || '',
    'Nama Orang Tua':d.namaOrtu,
    'No WA':d.noWa,
    'Alamat':d.alamat || '',
    'ID Kelas':d.idKelas || '',
    'Program Dipilih':d.programDipilih || kelas['Nama Kelas'] || '',
    'Jadwal Dipilih':d.jadwalDipilih || kelas['Jadwal'] || '',
    'Catatan':d.catatan || '',
    'Status Pendaftaran':'Baru',
    'ID Siswa':'',
    'Diproses Oleh':''
  });

  return {
    status:true,
    message:'Pendaftaran berhasil dikirim. Admin Sanggar Belajar Mam Is akan menghubungi orang tua/wali.',
    idPendaftaran:id
  };
}

function updateStatusPendaftaran_(d) {
  required_(d,['idPendaftaran','statusPendaftaran']);
  updateById_('Pendaftaran','ID Pendaftaran',d.idPendaftaran,{
    'Status Pendaftaran':d.statusPendaftaran,
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });
  return {status:true,message:'Status pendaftaran berhasil diperbarui.'};
}

function terimaPendaftaran_(d) {
  required_(d,['idPendaftaran']);
  const row = getRows_('Pendaftaran').find(r =>
    String(r['ID Pendaftaran'])===String(d.idPendaftaran)
  );
  if (!row) return {status:false,message:'Pendaftaran tidak ditemukan.'};

  if (row['ID Siswa']) {
    return {
      status:false,
      message:'Pendaftaran ini sudah pernah diterima.',
      idSiswa:row['ID Siswa']
    };
  }

  const idSiswa = nextId_('SIS');
  appendObject_('Siswa',{
    'ID Siswa':idSiswa,
    'Nama Siswa':row['Nama Siswa'],
    'Jenjang':row['Jenjang'],
    'Nama Orang Tua':row['Nama Orang Tua'],
    'No WA':row['No WA'],
    'Alamat':row['Alamat'],
    'Status Aktif':'Aktif',
    'Tanggal Daftar':todayText_()
  });

  if (row['ID Kelas']) {
    const kelas = getRows_('Kelas').find(k =>
      String(k['ID Kelas'])===String(row['ID Kelas'])
    ) || {};
    appendObject_('Peserta',{
      'ID Peserta':nextId_('PST'),
      'ID Siswa':idSiswa,
      'Nama Siswa':row['Nama Siswa'],
      'ID Kelas':row['ID Kelas'],
      'Nama Kelas':row['Program Dipilih'] || kelas['Nama Kelas'] || '',
      'Tanggal Masuk':todayText_(),
      'Status Aktif':'Aktif'
    });
  }

  const akun = createStudentAccount_(idSiswa,row['Nama Siswa']);

  updateById_('Pendaftaran','ID Pendaftaran',d.idPendaftaran,{
    'Status Pendaftaran':'Diterima',
    'ID Siswa':idSiswa,
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });

  return {
    status:true,
    message:'Pendaftaran diterima dan akun siswa berhasil dibuat.',
    idSiswa,
    username:akun.username,
    pin:akun.pin,
    namaSiswa:row['Nama Siswa'],
    noWa:row['No WA']
  };
}


function hapusPendaftaran_(d) {
  required_(d,['idPendaftaran']);
  const row = getRows_('Pendaftaran').find(r =>
    String(r['ID Pendaftaran'])===String(d.idPendaftaran)
  );
  if (!row) return {status:false,message:'Pendaftaran tidak ditemukan.'};

  const current = String(row['Status Pendaftaran'] || 'Baru');
  updateById_('Pendaftaran','ID Pendaftaran',d.idPendaftaran,{
    'Status Sebelum Hapus':current,
    'Status Pendaftaran':'Terhapus',
    'Tanggal Hapus':nowText_(),
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });
  return {status:true,message:'Pendaftaran dipindahkan ke Terhapus.'};
}

function arsipkanPendaftaran_(d) {
  required_(d,['idPendaftaran']);
  updateById_('Pendaftaran','ID Pendaftaran',d.idPendaftaran,{
    'Status Sebelum Hapus':'Diterima',
    'Status Pendaftaran':'Diarsipkan',
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });
  return {status:true,message:'Pendaftaran berhasil diarsipkan.'};
}

function pulihkanPendaftaran_(d) {
  required_(d,['idPendaftaran']);
  const row = getRows_('Pendaftaran').find(r =>
    String(r['ID Pendaftaran'])===String(d.idPendaftaran)
  );
  if (!row) return {status:false,message:'Pendaftaran tidak ditemukan.'};

  const restore = String(row['Status Sebelum Hapus'] || '').trim() ||
    (row['ID Siswa'] ? 'Diterima' : 'Menunggu Verifikasi');

  updateById_('Pendaftaran','ID Pendaftaran',d.idPendaftaran,{
    'Status Pendaftaran':restore,
    'Status Sebelum Hapus':'',
    'Tanggal Hapus':'',
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });
  return {status:true,message:'Pendaftaran berhasil dipulihkan.',statusPendaftaran:restore};
}

function hapusPermanenPendaftaran_(d) {
  required_(d,['idPendaftaran']);
  const row = getRows_('Pendaftaran').find(r =>
    String(r['ID Pendaftaran'])===String(d.idPendaftaran)
  );
  if (!row) return {status:false,message:'Pendaftaran tidak ditemukan.'};

  if (String(row['Status Pendaftaran']).toLowerCase()!=='terhapus') {
    return {status:false,message:'Pendaftaran harus dipindahkan ke Terhapus terlebih dahulu.'};
  }

  return deleteById_(
    'Pendaftaran',
    'ID Pendaftaran',
    d.idPendaftaran,
    'Pendaftaran'
  );
}

/* =========================
   AKUN, LOGIN, TOKEN
========================= */

function buatAkunSiswa_(d) {
  required_(d,['idSiswa']);
  const siswa = getRows_('Siswa').find(r =>
    String(r['ID Siswa'])===String(d.idSiswa)
  );
  if (!siswa) return {status:false,message:'Siswa tidak ditemukan.'};

  const result = createStudentAccount_(d.idSiswa,siswa['Nama Siswa'],d.pin);
  return {
    status:true,
    message:'Akun siswa berhasil dibuat.',
    username:result.username,
    pin:result.pin
  };
}

function createStudentAccount_(idSiswa,namaSiswa,pinCustom) {
  const akunRows = getRows_('Akun');
  const existing = akunRows.find(r => String(r['ID Siswa'])===String(idSiswa));

  const pin = String(pinCustom || randomPin_());
  const username = existing
    ? existing['Username']
    : makeUsername_(idSiswa,namaSiswa);

  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'Nama Siswa':namaSiswa,
      'Username':username,
      'PIN Hash':hash_(pin),
      'Peran':'Siswa',
      'Status Akun':'Aktif',
      'Token Aktif':'',
      'Token Kedaluwarsa':''
    });
    return {username,pin,idAkun:existing['ID Akun']};
  }

  const idAkun = nextId_('AKN');
  appendObject_('Akun',{
    'ID Akun':idAkun,
    'ID Siswa':idSiswa,
    'Nama Siswa':namaSiswa,
    'Username':username,
    'PIN Hash':hash_(pin),
    'Peran':'Siswa',
    'Status Akun':'Aktif',
    'Login Terakhir':'',
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  });

  return {username,pin,idAkun};
}

function login_(d,p) {
  required_(d,['username','pin']);
  const username = String(d.username).trim().toLowerCase();
  const pinHash = hash_(String(d.pin));

  const akun = getRows_('Akun').find(r =>
    String(r['Username']).trim().toLowerCase()===username
  );

  if (!akun || String(akun['PIN Hash'])!==pinHash) {
    logLogin_(akun || {},d.username,'Gagal',d.perangkat || p.perangkat || '');
    return {status:false,message:'Username atau PIN tidak sesuai.'};
  }

  if (!isActive_(akun['Status Akun'])) {
    logLogin_(akun,d.username,'Diblokir',d.perangkat || p.perangkat || '');
    return {status:false,message:'Akun sedang tidak aktif.'};
  }

  const token = makeToken_();
  const expires = new Date(Date.now() + CONFIG.SESSION_HOURS*60*60*1000);

  updateById_('Akun','ID Akun',akun['ID Akun'],{
    'Login Terakhir':nowText_(),
    'Token Aktif':token,
    'Token Kedaluwarsa':expires.toISOString()
  });

  logLogin_(akun,d.username,'Berhasil',d.perangkat || p.perangkat || '');

  return {
    status:true,
    message:'Login berhasil.',
    token,
    expires:expires.toISOString(),
    user:{
      idAkun:akun['ID Akun'],
      idSiswa:akun['ID Siswa'],
      nama:akun['Nama Siswa'],
      username:akun['Username'],
      peran:akun['Peran']
    }
  };
}

function logout_(token) {
  const akun = findAccountByToken_(token,false);
  if (akun) {
    updateById_('Akun','ID Akun',akun['ID Akun'],{
      'Token Aktif':'',
      'Token Kedaluwarsa':''
    });
  }
  return {status:true,message:'Logout berhasil.'};
}

function resetPin_(d) {
  required_(d,['idAkun']);
  const pin = String(d.pinBaru || randomPin_());
  updateById_('Akun','ID Akun',d.idAkun,{
    'PIN Hash':hash_(pin),
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  });
  return {status:true,message:'PIN berhasil direset.',pinBaru:pin};
}

function portalSiswa_(token) {
  const akun = requireSession_(token,'Siswa');
  const idSiswa = akun['ID Siswa'];

  const siswa = getRows_('Siswa').find(r =>
    String(r['ID Siswa'])===String(idSiswa)
  ) || {};

  const peserta = getRows_('Peserta').filter(r =>
    String(r['ID Siswa'])===String(idSiswa) && isActive_(r['Status Aktif'])
  );

  const kelasIds = peserta.map(r=>String(r['ID Kelas']));
  const kelas = getRows_('Kelas').filter(r=>kelasIds.includes(String(r['ID Kelas'])));

  const materi = getRows_('Materi')
    .filter(r =>
      isActive_(r['Status Materi']) &&
      (
        !r['ID Kelas'] ||
        String(r['ID Kelas'])==='SEMUA' ||
        kelasIds.includes(String(r['ID Kelas']))
      )
    )
    .sort((a,b)=>num_(a['Urutan'])-num_(b['Urutan']));

  const absensi = getRows_('Absensi').filter(r =>
    String(r['ID Siswa'])===String(idSiswa)
  );

  const pembayaran = getRows_('Pembayaran').filter(r =>
    String(r['ID Siswa'])===String(idSiswa)
  );

  const hasil = getRows_('Hasil_Latihan').filter(r =>
    String(r['ID Siswa'])===String(idSiswa)
  );

  const penilaian = getRows_('Penilaian')
    .filter(r =>
      String(r['ID Siswa'])===String(idSiswa) &&
      kelasIds.includes(String(r['ID Kelas']))
    )
    .sort((a,b)=>{
      const ta = num_(a['Tahun']);
      const tb = num_(b['Tahun']);
      if (ta!==tb) return tb-ta;
      return num_(b['Triwulan'])-num_(a['Triwulan']);
    });

  const pengumuman = getRows_('Pengumuman').filter(r => {
    if (!isActive_(r['Status'])) return false;
    const target = String(r['Target'] || '').toLowerCase();
    return target==='semua' ||
      target==='siswa' ||
      kelasIds.includes(String(r['ID Kelas']));
  });

  const totalHadir = absensi.filter(r =>
    String(r['Kehadiran']).toLowerCase()==='hadir'
  ).length;

  return {
    status:true,
    user:{
      idSiswa,
      nama:siswa['Nama Siswa'] || akun['Nama Siswa'],
      jenjang:siswa['Jenjang'] || '',
      namaOrtu:siswa['Nama Orang Tua'] || '',
      noWa:siswa['No WA'] || ''
    },
    kelas,
    peserta,
    materi,
    absensi,
    pembayaran,
    hasil,
    penilaian,
    pengumuman,
    summary:{
      jumlahKelas:kelas.length,
      jumlahMateri:materi.length,
      totalAbsensi:absensi.length,
      totalHadir,
      tunggakan:pembayaran.reduce((n,r)=>n+num_(r['Sisa']),0),
      rataPenilaian:penilaian.length
        ? Math.round(penilaian.reduce((n,r)=>n+num_(r['Nilai']),0)/penilaian.length)
        : 0,
      rataNilai:hasil.length
        ? Math.round(hasil.reduce((n,r)=>n+num_(r['Nilai']),0)/hasil.length)
        : 0
    }
  };
}

/* =========================
   MATERI DAN HASIL
========================= */

function addMateri_(d) {
  required_(d,['judulMateri']);
  const id = nextId_('MTR');
  appendObject_('Materi',{
    'ID Materi':id,
    'Judul Materi':d.judulMateri,
    'Jenjang':d.jenjang || '',
    'ID Kelas':d.idKelas || 'SEMUA',
    'Nama Kelas':d.namaKelas || 'Semua Kelas',
    'Kategori':d.kategori || '',
    'Jenis Materi':d.jenisMateri || 'Link',
    'Deskripsi':d.deskripsi || '',
    'Link Materi':d.linkMateri || '',
    'Urutan':num_(d.urutan),
    'Status Materi':d.statusMateri || 'Aktif',
    'Tanggal Terbit':d.tanggalTerbit || todayText_(),
    'Kode Akses':d.kodeAkses || ''
  });
  return {status:true,message:'Materi berhasil disimpan.',idMateri:id};
}

function updateMateri_(d) {
  required_(d,['idMateri','judulMateri']);
  updateById_('Materi','ID Materi',d.idMateri,{
    'Judul Materi':d.judulMateri,
    'Jenjang':d.jenjang || '',
    'ID Kelas':d.idKelas || 'SEMUA',
    'Nama Kelas':d.namaKelas || 'Semua Kelas',
    'Kategori':d.kategori || '',
    'Jenis Materi':d.jenisMateri || 'Link',
    'Deskripsi':d.deskripsi || '',
    'Link Materi':d.linkMateri || '',
    'Urutan':num_(d.urutan),
    'Status Materi':d.statusMateri || 'Aktif',
    'Tanggal Terbit':d.tanggalTerbit || todayText_(),
    'Kode Akses':d.kodeAkses || ''
  });
  return {status:true,message:'Materi berhasil diperbarui.'};
}

function bukaMateri_(d,tokenParam) {
  const token = tokenParam || d.token;
  const akun = requireSession_(token,'Siswa');
  required_(d,['idMateri']);

  const materi = getRows_('Materi').find(r =>
    String(r['ID Materi'])===String(d.idMateri)
  );
  if (!materi || !isActive_(materi['Status Materi'])) {
    return {status:false,message:'Materi tidak ditemukan atau tidak aktif.'};
  }

  const akses = getRows_('Akses_Materi').find(r =>
    String(r['ID Siswa'])===String(akun['ID Siswa']) &&
    String(r['ID Materi'])===String(d.idMateri)
  );

  if (materi['Kode Akses'] &&
      String(d.kodeAkses || '')!==String(materi['Kode Akses'])) {
    return {status:false,message:'Kode akses materi tidak sesuai.'};
  }

  if (akses) {
    updateById_('Akses_Materi','ID Akses',akses['ID Akses'],{
      'Status Akses':'Dibuka',
      'Tanggal Dibuka':nowText_(),
      'Progress':d.progress || akses['Progress'] || 0
    });
  } else {
    appendObject_('Akses_Materi',{
      'ID Akses':nextId_('AKS'),
      'ID Siswa':akun['ID Siswa'],
      'ID Materi':d.idMateri,
      'Status Akses':'Dibuka',
      'Tanggal Dibuka':nowText_(),
      'Progress':d.progress || 0
    });
  }

  return {
    status:true,
    message:'Akses materi diberikan.',
    materi
  };
}

function simpanHasilLatihan_(d,tokenParam) {
  const token = tokenParam || d.token;
  const akun = requireSession_(token,'Siswa');

  required_(d,['judulLatihan','nilai']);
  const id = nextId_('HSL');
  appendObject_('Hasil_Latihan',{
    'ID Hasil':id,
    'Tanggal':nowText_(),
    'ID Siswa':akun['ID Siswa'],
    'Nama Siswa':akun['Nama Siswa'],
    'ID Materi':d.idMateri || '',
    'Judul Latihan':d.judulLatihan,
    'Nilai':num_(d.nilai),
    'Jawaban Benar':num_(d.jawabanBenar),
    'Jumlah Soal':num_(d.jumlahSoal),
    'Durasi':d.durasi || '',
    'Status':d.status || 'Selesai'
  });

  return {status:true,message:'Hasil latihan berhasil disimpan.',idHasil:id};
}

/* =========================
   PENGUMUMAN
========================= */

function addPengumuman_(d) {
  required_(d,['judul','isi']);
  const id = nextId_('PNG');
  appendObject_('Pengumuman',{
    'ID Pengumuman':id,
    'Tanggal':d.tanggal || nowText_(),
    'Judul':d.judul,
    'Isi':d.isi,
    'Target':d.target || 'Semua',
    'ID Kelas':d.idKelas || '',
    'Status':d.status || 'Aktif'
  });
  return {status:true,message:'Pengumuman berhasil disimpan.',idPengumuman:id};
}

function updatePengumuman_(d) {
  required_(d,['idPengumuman','judul','isi']);
  updateById_('Pengumuman','ID Pengumuman',d.idPengumuman,{
    'Tanggal':d.tanggal || nowText_(),
    'Judul':d.judul,
    'Isi':d.isi,
    'Target':d.target || 'Semua',
    'ID Kelas':d.idKelas || '',
    'Status':d.status || 'Aktif'
  });
  return {status:true,message:'Pengumuman berhasil diperbarui.'};
}

/* =========================
   SESSION HELPERS
========================= */

function requireSession_(token,role) {
  const akun = findAccountByToken_(token,true);
  if (!akun) throw new Error('Sesi tidak valid atau sudah berakhir. Silakan login kembali.');
  if (role && String(akun['Peran']).toLowerCase()!==String(role).toLowerCase()) {
    throw new Error('Akun tidak memiliki hak akses untuk halaman ini.');
  }
  return akun;
}

function findAccountByToken_(token,checkExpiry) {
  if (!token) return null;
  const akun = getRows_('Akun').find(r =>
    String(r['Token Aktif'])===String(token)
  );
  if (!akun) return null;

  if (checkExpiry) {
    const exp = new Date(akun['Token Kedaluwarsa']);
    if (!exp.getTime() || exp.getTime()<Date.now()) return null;
  }
  return akun;
}

function logLogin_(akun,username,status,perangkat) {
  appendObject_('Aktivitas_Login',{
    'ID Aktivitas':nextId_('LOG'),
    'Waktu':nowText_(),
    'ID Akun':akun['ID Akun'] || '',
    'ID Siswa':akun['ID Siswa'] || '',
    'Username':username || '',
    'Peran':akun['Peran'] || '',
    'Status':status,
    'Perangkat':perangkat || ''
  });
}

/* =========================
   GENERIC SHEET HELPERS
========================= */

function getSS_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak ditemukan. Isi CONFIG.SPREADSHEET_ID.');
  return ss;
}

function ensureSetup_() {
  const ss = getSS_();
  const missing = Object.keys(SCHEMA).filter(n=>!ss.getSheetByName(n));
  if (missing.length) setupDatabase();
}

function getSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "'+name+'" belum tersedia.');
  return sh;
}

function getRows_(name) {
  ensureSetup_();
  const sh = getSheet_(name);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow<2 || lastCol<1) return [];

  const values = sh.getRange(1,1,lastRow,lastCol).getDisplayValues();
  const headers = values.shift().map(String);

  return values
    .filter(row=>row.some(v=>String(v).trim()!==''))
    .map(row=>{
      const obj = {};
      headers.forEach((h,i)=>obj[h]=row[i]!==undefined ? row[i] : '');
      return obj;
    });
}

function appendObject_(sheetName,obj) {
  appendObjects_(sheetName,[obj]);
}

function appendObjects_(sheetName,objects) {
  if (!objects.length) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_(sheetName);
    const headers = getHeaders_(sh);
    const rows = objects.map(obj => headers.map(h =>
      obj[h] !== undefined && obj[h] !== null ? obj[h] : ''
    ));
    sh.getRange(sh.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
  } finally {
    lock.releaseLock();
  }
}

function updateById_(sheetName,idHeader,idValue,updates) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_(sheetName);
    const headers = getHeaders_(sh);
    const idCol = headers.indexOf(idHeader);
    if (idCol<0) throw new Error('Kolom ID tidak ditemukan: '+idHeader);

    const lastRow = sh.getLastRow();
    if (lastRow<2) throw new Error('Data tidak ditemukan.');

    const ids = sh.getRange(2,idCol+1,lastRow-1,1).getDisplayValues().flat();
    const idx = ids.findIndex(v=>String(v)===String(idValue));
    if (idx<0) throw new Error('Data dengan ID '+idValue+' tidak ditemukan.');

    const rowNumber = idx+2;
    const row = sh.getRange(rowNumber,1,1,headers.length).getValues()[0];

    Object.keys(updates).forEach(key=>{
      const col = headers.indexOf(key);
      if (col>=0) row[col] = updates[key];
    });

    sh.getRange(rowNumber,1,1,headers.length).setValues([row]);
  } finally {
    lock.releaseLock();
  }
}

function deleteById_(sheetName,idHeader,idValue,label) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_(sheetName);
    const headers = getHeaders_(sh);
    const idCol = headers.indexOf(idHeader);
    if (idCol<0) throw new Error('Kolom ID tidak ditemukan.');

    const lastRow = sh.getLastRow();
    if (lastRow<2) return {status:false,message:'Data tidak ditemukan.'};

    const ids = sh.getRange(2,idCol+1,lastRow-1,1).getDisplayValues().flat();
    const idx = ids.findIndex(v=>String(v)===String(idValue));
    if (idx<0) return {status:false,message:'Data tidak ditemukan.'};

    sh.deleteRow(idx+2);
    return {status:true,message:(label || 'Data')+' berhasil dihapus.'};
  } finally {
    lock.releaseLock();
  }
}

function getHeaders_(sh) {
  return sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(String);
}

/* =========================
   GENERAL HELPERS
========================= */

function output_(data,callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(String(callback)+'('+json+')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function validateApiKey_(key) {
  if (String(key || '')!==String(CONFIG.API_KEY)) {
    throw new Error('API key tidak valid.');
  }
}

function parseData_(data) {
  if (!data) return {};
  if (typeof data==='object') return data;
  try { return JSON.parse(data); }
  catch (e) { throw new Error('Format data JSON tidak valid.'); }
}

function required_(obj,keys) {
  keys.forEach(k=>{
    if (obj[k]===undefined || obj[k]===null || String(obj[k]).trim()==='') {
      throw new Error('Data wajib belum diisi: '+k);
    }
  });
}

function nextId_(prefix) {
  const stamp = Utilities.formatDate(new Date(),CONFIG.TIMEZONE,'yyMMddHHmmss');
  const random = Math.floor(100+Math.random()*900);
  return prefix+'-'+stamp+'-'+random;
}

function makeUsername_(idSiswa,nama) {
  const id = String(idSiswa || '').replace(/[^A-Za-z0-9]/g,'').slice(-8);
  const first = String(nama || 'siswa')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'')
    .slice(0,8);
  return (first || 'siswa') + id.toLowerCase();
}

function randomPin_() {
  return String(Math.floor(100000+Math.random()*900000));
}

function makeToken_() {
  return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
}

function hash_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text),
    Utilities.Charset.UTF_8
  );
  return digest.map(b=>{
    const v = b<0 ? b+256 : b;
    return ('0'+v.toString(16)).slice(-2);
  }).join('');
}

function sanitizeAkun_(rows) {
  return rows.map(r=>({
    'ID Akun':r['ID Akun'],
    'ID Siswa':r['ID Siswa'],
    'Nama Siswa':r['Nama Siswa'],
    'Username':r['Username'],
    'Peran':r['Peran'],
    'Status Akun':r['Status Akun'],
    'Login Terakhir':r['Login Terakhir']
  }));
}

function num_(v) {
  if (typeof v==='number') return v;
  const s = String(v || '')
    .replace(/\./g,'')
    .replace(/,/g,'.')
    .replace(/[^0-9.-]/g,'');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function isActive_(v) {
  const s = String(v || '').trim().toLowerCase();
  return s==='' || s==='aktif' || s==='active' || s==='ya' || s==='true';
}

function normalizeMonth_(v) {
  const s = String(v || '');
  const m = s.match(/^(\d{4})-(\d{2})/);
  return m ? m[1]+'-'+m[2] : s.slice(0,7);
}

function todayText_() {
  return Utilities.formatDate(new Date(),CONFIG.TIMEZONE,'yyyy-MM-dd');
}

function nowText_() {
  return Utilities.formatDate(new Date(),CONFIG.TIMEZONE,'yyyy-MM-dd HH:mm:ss');
}


/* =========================================================
   MODUL FINAL MULTI-KELAS & PEMBAYARAN BULANAN
   Tempel bagian ini PALING BAWAH pada Code.gs.
   Fungsi dengan nama sama di bawah ini menggantikan versi lama.
========================================================= */

// Tambahkan kolom baru tanpa menghapus data lama.
SCHEMA.Pendaftaran = [
  'ID Pendaftaran','Tanggal','Nama Siswa','Jenis Kelamin','Tempat Lahir',
  'Tanggal Lahir','Jenjang','Kelas Sekolah','Nama Sekolah',
  'Nama Orang Tua','No WA','Alamat',
  'ID Kelas','Program Dipilih','Jadwal Dipilih',
  'ID Kelas Terpilih','Program Terpilih','Rincian Kelas',
  'Bulan Mulai','Biaya Pendaftaran','Total Tagihan','Nominal Dibayar',
  'Metode Bayar','Nama Pengirim','Tanggal Bayar','Bukti Pembayaran',
  'Status Pembayaran','Catatan','Status Pendaftaran','Status Sebelum Hapus','Tanggal Hapus','ID Siswa','Diproses Oleh'
];

SCHEMA.Peserta = [
  'ID Peserta','ID Siswa','Nama Siswa','ID Kelas','Nama Kelas',
  'Tanggal Masuk','Mulai Bulan','Akhir Bulan','Status Aktif'
];

SCHEMA.Permohonan_Kelas = [
  'ID Permohonan','Tanggal','ID Siswa','Nama Siswa','Jenis Permohonan',
  'Bulan Berlaku','ID Kelas','Nama Kelas','Biaya Bulanan',
  'Status','Catatan Siswa','Catatan Admin','Diproses Oleh'
];

function routeActionMultiKelas_(action,p) {
  switch (action) {
    case 'addPermohonanKelas':
      return addPermohonanKelas_(parseData_(p.data),p.token);
    case 'prosesPermohonanKelas':
      return prosesPermohonanKelas_(parseData_(p.data));
    case 'getPilihanKelasSiswa':
      return getPilihanKelasSiswa_(p.token);
    case 'getPendaftaranRincian':
      return getPendaftaranRincian_(p.idPendaftaran);
    default:
      return null;
  }
}

// Sisipkan pemanggilan modul tambahan pada route utama.
// Fungsi ini menggantikan routeAction_ lama dan tetap memuat semua action sebelumnya.
const routeActionLamaMamis_ = routeAction_;
routeAction_ = function(action,p) {
  const extra = routeActionMultiKelas_(action,p);
  if (extra !== null) return extra;
  return routeActionLamaMamis_(action,p);
};

function addPendaftaran_(d) {
  required_(d,['namaSiswa','jenjang','namaOrtu','noWa']);

  const ids = Array.isArray(d.idKelasList)
    ? d.idKelasList.map(String).filter(Boolean)
    : String(d.idKelas || '').split(',').map(s=>s.trim()).filter(Boolean);

  if (!ids.length) {
    return {status:false,message:'Pilih minimal satu kelas.'};
  }

  const semuaKelas = getRows_('Kelas').filter(r=>isActive_(r['Status Kelas']));
  const pilihan = ids.map(id=>semuaKelas.find(k=>String(k['ID Kelas'])===String(id)))
    .filter(Boolean);

  if (!pilihan.length) {
    return {status:false,message:'Kelas yang dipilih tidak ditemukan atau tidak aktif.'};
  }

  const totalKelas = pilihan.reduce((n,k)=>n+num_(k['Biaya Bulanan']),0);
  const biayaPendaftaran = num_(d.biayaPendaftaran || BIAYA_PENDAFTARAN_SISWA_BARU);
  const total = totalKelas + biayaPendaftaran;
  const nominal = num_(d.nominalDibayar);
  const rincian = pilihan.map(k=>({
    idKelas:k['ID Kelas'],
    namaKelas:k['Nama Kelas'],
    jadwal:k['Jadwal'] || '',
    biaya:num_(k['Biaya Bulanan'])
  }));

  let buktiUrl = String(d.buktiPembayaran || '');
  if (d.buktiBase64 && d.buktiNama) {
    buktiUrl = simpanBuktiPembayaran_(d.buktiBase64,d.buktiNama,d.namaSiswa);
  }

  const statusBayar = buktiUrl
    ? (nominal >= total ? 'Menunggu Verifikasi' : 'Nominal Kurang')
    : 'Belum Ada Bukti';

  const id = nextId_('DFT');
  appendObject_('Pendaftaran',{
    'ID Pendaftaran':id,
    'Tanggal':nowText_(),
    'Nama Siswa':d.namaSiswa,
    'Jenis Kelamin':d.jenisKelamin || '',
    'Tempat Lahir':d.tempatLahir || '',
    'Tanggal Lahir':d.tanggalLahir || '',
    'Jenjang':d.jenjang,
    'Kelas Sekolah':d.kelasSekolah || '',
    'Nama Sekolah':d.namaSekolah || '',
    'Nama Orang Tua':d.namaOrtu,
    'No WA':d.noWa,
    'Alamat':d.alamat || '',
    'ID Kelas':ids.join(','),
    'Program Dipilih':pilihan.map(k=>k['Nama Kelas']).join(', '),
    'Jadwal Dipilih':pilihan.map(k=>k['Jadwal'] || '-').join(' | '),
    'ID Kelas Terpilih':ids.join(','),
    'Program Terpilih':pilihan.map(k=>k['Nama Kelas']).join(', '),
    'Rincian Kelas':JSON.stringify(rincian),
    'Bulan Mulai':normalizeMonth_(d.bulanMulai || todayText_().slice(0,7)),
    'Biaya Pendaftaran':biayaPendaftaran,
    'Total Tagihan':total,
    'Nominal Dibayar':nominal,
    'Metode Bayar':d.metodeBayar || 'Transfer',
    'Nama Pengirim':d.namaPengirim || '',
    'Tanggal Bayar':d.tanggalBayar || todayText_(),
    'Bukti Pembayaran':buktiUrl,
    'Status Pembayaran':statusBayar,
    'Catatan':d.catatan || '',
    'Status Pendaftaran':'Menunggu Verifikasi',
    'ID Siswa':'',
    'Diproses Oleh':''
  });

  return {
    status:true,
    message:'Pendaftaran dan bukti pembayaran berhasil dikirim. Admin akan melakukan verifikasi.',
    idPendaftaran:id,
    biayaPendaftaran:biayaPendaftaran,
    totalKelas:totalKelas,
    totalTagihan:total,
    statusPembayaran:statusBayar
  };
}

function terimaPendaftaran_(d) {
  required_(d,['idPendaftaran']);
  const row = getRows_('Pendaftaran').find(r =>
    String(r['ID Pendaftaran'])===String(d.idPendaftaran)
  );
  if (!row) return {status:false,message:'Pendaftaran tidak ditemukan.'};

  if (String(row['Status Pendaftaran']).toLowerCase()==='diterima' && row['ID Siswa']) {
    return {status:false,message:'Pendaftaran ini sudah diterima.',idSiswa:row['ID Siswa']};
  }

  if (!String(row['Bukti Pembayaran'] || '').trim()) {
    return {status:false,message:'Bukti pembayaran belum tersedia.'};
  }

  if (num_(row['Nominal Dibayar']) < num_(row['Total Tagihan'])) {
    return {status:false,message:'Nominal pembayaran masih kurang dari total tagihan.'};
  }

  const siswaRows = getRows_('Siswa');
  let siswa = siswaRows.find(s =>
    String(s['Nama Siswa']).trim().toLowerCase()===String(row['Nama Siswa']).trim().toLowerCase() &&
    String(s['No WA']).replace(/\D/g,'')===String(row['No WA']).replace(/\D/g,'')
  );

  let idSiswa;
  let siswaBaru = false;

  if (siswa) {
    idSiswa = siswa['ID Siswa'];
  } else {
    siswaBaru = true;
    idSiswa = nextId_('SIS');
    appendObject_('Siswa',{
      'ID Siswa':idSiswa,
      'Nama Siswa':row['Nama Siswa'],
      'Jenjang':row['Jenjang'],
      'Nama Orang Tua':row['Nama Orang Tua'],
      'No WA':row['No WA'],
      'Alamat':row['Alamat'],
      'Status Aktif':'Aktif',
      'Tanggal Daftar':todayText_()
    });
  }

  let rincian = [];
  try { rincian = JSON.parse(row['Rincian Kelas'] || '[]'); } catch(e) {}
  if (!rincian.length) {
    const ids = String(row['ID Kelas Terpilih'] || row['ID Kelas'] || '')
      .split(',').map(s=>s.trim()).filter(Boolean);
    const kelasRows = getRows_('Kelas');
    rincian = ids.map(id=>{
      const k = kelasRows.find(x=>String(x['ID Kelas'])===String(id)) || {};
      return {
        idKelas:id,
        namaKelas:k['Nama Kelas'] || '',
        biaya:num_(k['Biaya Bulanan'])
      };
    });
  }

  const mulaiBulan = normalizeMonth_(row['Bulan Mulai'] || todayText_().slice(0,7));
  const pesertaRows = getRows_('Peserta');

  rincian.forEach(k=>{
    const sudahAda = pesertaRows.find(p =>
      String(p['ID Siswa'])===String(idSiswa) &&
      String(p['ID Kelas'])===String(k.idKelas) &&
      isActive_(p['Status Aktif'])
    );
    if (!sudahAda) {
      appendObject_('Peserta',{
        'ID Peserta':nextId_('PST'),
        'ID Siswa':idSiswa,
        'Nama Siswa':row['Nama Siswa'],
        'ID Kelas':k.idKelas,
        'Nama Kelas':k.namaKelas,
        'Tanggal Masuk':todayText_(),
        'Mulai Bulan':mulaiBulan,
        'Akhir Bulan':'',
        'Status Aktif':'Aktif'
      });
    }
  });

  const pembayaranExisting = getRows_('Pembayaran').find(p =>
    String(p['Keterangan'] || '').includes(String(row['ID Pendaftaran']))
  );

  if (!pembayaranExisting) {
    appendObject_('Pembayaran',{
      'ID Pembayaran':nextId_('BYR'),
      'Tanggal Bayar':row['Tanggal Bayar'] || todayText_(),
      'Bulan Pembayaran':mulaiBulan,
      'ID Siswa':idSiswa,
      'Nama Siswa':row['Nama Siswa'],
      'ID Kelas':'MULTI',
      'Nama Kelas':rincian.map(x=>x.namaKelas).join(', '),
      'Tagihan':num_(row['Total Tagihan']),
      'Dibayar':num_(row['Nominal Dibayar']),
      'Sisa':Math.max(num_(row['Total Tagihan'])-num_(row['Nominal Dibayar']),0),
      'Status Pembayaran':'Lunas',
      'Metode Bayar':row['Metode Bayar'] || 'Transfer',
      'Keterangan':'Pendaftaran '+row['ID Pendaftaran']+' | Bukti: '+(row['Bukti Pembayaran'] || ''),
      'Riwayat Pelunasan':''
    });
  }

  const akunRows = getRows_('Akun');
  const existingAkun = akunRows.find(a=>String(a['ID Siswa'])===String(idSiswa));
  let akunResult;
  if (existingAkun) {
    akunResult = {username:existingAkun['Username'],pin:'PIN lama tetap berlaku'};
  } else {
    akunResult = createStudentAccount_(idSiswa,row['Nama Siswa']);
  }

  updateById_('Pendaftaran','ID Pendaftaran',d.idPendaftaran,{
    'Status Pembayaran':'Terverifikasi',
    'Status Pendaftaran':'Diterima',
    'ID Siswa':idSiswa,
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });

  return {
    status:true,
    message:siswaBaru
      ? 'Pembayaran terverifikasi, siswa dan akun berhasil dibuat.'
      : 'Pembayaran terverifikasi dan kelas tambahan berhasil diaktifkan.',
    idSiswa,
    username:akunResult.username,
    pin:akunResult.pin,
    namaSiswa:row['Nama Siswa'],
    noWa:row['No WA'],
    siswaBaru
  };
}

function simpanBuktiPembayaran_(dataUrl,namaFile,namaSiswa) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Format bukti pembayaran tidak valid.');

  const mime = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const safeName = String(namaSiswa || 'siswa').replace(/[^a-zA-Z0-9_-]/g,'_');
  const fileName = Utilities.formatDate(new Date(),CONFIG.TIMEZONE,'yyyyMMdd_HHmmss')+
    '_'+safeName+'_'+String(namaFile || 'bukti').replace(/[^a-zA-Z0-9._-]/g,'_');

  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('MAMIS_BUKTI_FOLDER_ID');
  let folder;

  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch(e) {}
  }
  if (!folder) {
    folder = DriveApp.createFolder('Bukti Pembayaran Sanggar Belajar Mam Is');
    props.setProperty('MAMIS_BUKTI_FOLDER_ID',folder.getId());
  }

  const blob = Utilities.newBlob(bytes,mime,fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getPendaftaranRincian_(idPendaftaran) {
  const row = getRows_('Pendaftaran').find(r =>
    String(r['ID Pendaftaran'])===String(idPendaftaran)
  );
  if (!row) return {status:false,message:'Pendaftaran tidak ditemukan.'};
  let rincian=[];
  try { rincian=JSON.parse(row['Rincian Kelas'] || '[]'); } catch(e) {}
  return {status:true,pendaftaran:row,rincian};
}

function getPilihanKelasSiswa_(token) {
  const akun = requireSession_(token,'Siswa');
  const idSiswa = akun['ID Siswa'];
  const peserta = getRows_('Peserta').filter(p =>
    String(p['ID Siswa'])===String(idSiswa) && isActive_(p['Status Aktif'])
  );
  const aktifIds = peserta.map(p=>String(p['ID Kelas']));
  const kelas = getRows_('Kelas').filter(k=>isActive_(k['Status Kelas'])).map(k=>({
    idKelas:k['ID Kelas'],
    namaKelas:k['Nama Kelas'],
    jenjang:k['Jenjang'] || '',
    kategori:k['Kategori'] || '',
    deskripsi:k['Deskripsi Program'] || '',
    materi:k['Materi Program'] || '',
    biaya:num_(k['Biaya Bulanan']),
    jadwal:k['Jadwal'] || '',
    sedangDiikuti:aktifIds.includes(String(k['ID Kelas']))
  }));
  return {status:true,kelas};
}

function addPermohonanKelas_(d,token) {
  const akun = requireSession_(token,'Siswa');
  required_(d,['jenisPermohonan','bulanBerlaku','idKelas']);

  const kelas = getRows_('Kelas').find(k=>String(k['ID Kelas'])===String(d.idKelas));
  if (!kelas) return {status:false,message:'Kelas tidak ditemukan.'};

  const id = nextId_('PMK');
  appendObject_('Permohonan_Kelas',{
    'ID Permohonan':id,
    'Tanggal':nowText_(),
    'ID Siswa':akun['ID Siswa'],
    'Nama Siswa':akun['Nama Siswa'],
    'Jenis Permohonan':d.jenisPermohonan,
    'Bulan Berlaku':normalizeMonth_(d.bulanBerlaku),
    'ID Kelas':d.idKelas,
    'Nama Kelas':kelas['Nama Kelas'],
    'Biaya Bulanan':num_(kelas['Biaya Bulanan']),
    'Status':'Menunggu',
    'Catatan Siswa':d.catatan || '',
    'Catatan Admin':'',
    'Diproses Oleh':''
  });

  return {status:true,message:'Permohonan perubahan kelas berhasil dikirim.',idPermohonan:id};
}

function prosesPermohonanKelas_(d) {
  required_(d,['idPermohonan','keputusan']);
  const row = getRows_('Permohonan_Kelas').find(r =>
    String(r['ID Permohonan'])===String(d.idPermohonan)
  );
  if (!row) return {status:false,message:'Permohonan tidak ditemukan.'};

  if (String(d.keputusan).toLowerCase()!=='terima') {
    updateById_('Permohonan_Kelas','ID Permohonan',d.idPermohonan,{
      'Status':'Ditolak',
      'Catatan Admin':d.catatanAdmin || '',
      'Diproses Oleh':d.diprosesOleh || 'Admin'
    });
    return {status:true,message:'Permohonan ditolak.'};
  }

  const jenis = String(row['Jenis Permohonan']).toLowerCase();
  if (jenis.includes('tambah')) {
    const siswa = getRows_('Siswa').find(s=>String(s['ID Siswa'])===String(row['ID Siswa'])) || {};
    appendObject_('Peserta',{
      'ID Peserta':nextId_('PST'),
      'ID Siswa':row['ID Siswa'],
      'Nama Siswa':row['Nama Siswa'] || siswa['Nama Siswa'],
      'ID Kelas':row['ID Kelas'],
      'Nama Kelas':row['Nama Kelas'],
      'Tanggal Masuk':todayText_(),
      'Mulai Bulan':row['Bulan Berlaku'],
      'Akhir Bulan':'',
      'Status Aktif':'Aktif'
    });
  } else {
    const peserta = getRows_('Peserta').find(p =>
      String(p['ID Siswa'])===String(row['ID Siswa']) &&
      String(p['ID Kelas'])===String(row['ID Kelas']) &&
      isActive_(p['Status Aktif'])
    );
    if (peserta) {
      updateById_('Peserta','ID Peserta',peserta['ID Peserta'],{
        'Akhir Bulan':row['Bulan Berlaku'],
        'Status Aktif':'Tidak Aktif'
      });
    }
  }

  updateById_('Permohonan_Kelas','ID Permohonan',d.idPermohonan,{
    'Status':'Diterima',
    'Catatan Admin':d.catatanAdmin || '',
    'Diproses Oleh':d.diprosesOleh || 'Admin'
  });

  return {status:true,message:'Permohonan perubahan kelas berhasil diproses.'};
}


/* =========================================================
   UPGRADE ADMIN V5 - DATA SISWA, KELAS, DAN PENILAIAN TRIWULAN
========================================================= */

SCHEMA.Siswa = [
  'ID Siswa','Nama Siswa','Jenis Kelamin','Tempat Lahir','Tanggal Lahir',
  'Jenjang','Kelas Sekolah','Nama Sekolah','Nama Orang Tua','No WA',
  'Alamat','Status Aktif','Tanggal Daftar'
];

SCHEMA.Penilaian = [
  'ID Penilaian','ID Peserta','ID Siswa','Nama Siswa','ID Kelas','Nama Kelas',
  'Tahun','Triwulan','Periode','Nilai','Catatan','ID Pengajar',
  'Nama Pengajar','Tanggal Input','Diperbarui'
];

const routeActionSebelumV5_ = routeAction_;
routeAction_ = function(action,p) {
  switch (action) {
    case 'simpanPenilaian':
      validateApiKey_(p.key);
      return simpanPenilaian_(parseData_(p.data));
    case 'hapusSiswaTidakAktif':
      validateApiKey_(p.key);
      return hapusSiswaTidakAktif_(parseData_(p.data));
    default:
      return routeActionSebelumV5_(action,p);
  }
};

function bootstrap_() {
  ensureSetup_();

  const siswa = getRows_('Siswa');
  const pengajar = getRows_('Pengajar');
  const kelas = getRows_('Kelas');
  const pesertaSemua = getRows_('Peserta');
  const siswaAktifIds = new Set(
    siswa.filter(r=>isActive_(r['Status Aktif'])).map(r=>String(r['ID Siswa']))
  );
  // Peserta Kelas hanya menampilkan siswa yang masih aktif.
  // Baris lama milik siswa tidak aktif/terhapus tidak ikut dikirim ke dashboard.
  const peserta = pesertaSemua.filter(r=>siswaAktifIds.has(String(r['ID Siswa'])));
  const penilaian = getRows_('Penilaian');
  const pembayaran = getRows_('Pembayaran');
  const absensi = getRows_('Absensi');
  const pendaftaran = getRows_('Pendaftaran');
  const akun = sanitizeAkun_(getRows_('Akun'));
  const materi = getRows_('Materi');
  const hasil = getRows_('Hasil_Latihan');
  const pengumuman = getRows_('Pengumuman');

  const thisMonth = Utilities.formatDate(new Date(),CONFIG.TIMEZONE,'yyyy-MM');
  const pembayaranBulanIni = pembayaran.filter(r =>
    normalizeMonth_(r['Bulan Pembayaran']) === thisMonth
  );

  return {
    status:true,
    siswa,pengajar,kelas,peserta,penilaian,pembayaran,absensi,
    pendaftaran,akun,materi,hasil,pengumuman,
    summary:{
      jumlahSiswaAktif:siswa.filter(r=>isActive_(r['Status Aktif'])).length,
      jumlahPengajarAktif:pengajar.filter(r=>isActive_(r['Status Aktif'])).length,
      jumlahKelasAktif:kelas.filter(r=>isActive_(r['Status Kelas'])).length,
      jumlahPesertaKelas:peserta.filter(r=>isActive_(r['Status Aktif'])).length,
      pendaftaranBaru:pendaftaran.filter(r =>
        ['baru','menunggu verifikasi'].includes(String(r['Status Pendaftaran']).toLowerCase())
      ).length,
      jumlahMateriAktif:materi.filter(r=>isActive_(r['Status Materi'])).length,
      totalPembayaranBulanIni:pembayaranBulanIni.reduce((n,r)=>n+num_(r['Dibayar']),0),
      totalTunggakan:pembayaran.reduce((n,r)=>n+num_(r['Sisa']),0)
    }
  };
}

function addSiswa_(d) {
  required_(d,['namaSiswa','jenjang','namaOrtu','noWa']);
  const id = nextId_('SIS');

  appendObject_('Siswa',{
    'ID Siswa':id,
    'Nama Siswa':d.namaSiswa,
    'Jenis Kelamin':d.jenisKelamin || '',
    'Tempat Lahir':d.tempatLahir || '',
    'Tanggal Lahir':d.tanggalLahir || '',
    'Jenjang':d.jenjang,
    'Kelas Sekolah':d.kelasSekolah || '',
    'Nama Sekolah':d.namaSekolah || '',
    'Nama Orang Tua':d.namaOrtu,
    'No WA':d.noWa,
    'Alamat':d.alamat || '',
    'Status Aktif':d.statusAktif || 'Aktif',
    'Tanggal Daftar':todayText_()
  });

  sinkronKelasSiswa_(id,d.namaSiswa,d.idKelasList || [],d.statusAktif || 'Aktif');
  return {status:true,message:'Siswa dan pilihan kelas berhasil disimpan.',idSiswa:id};
}

function updateSiswa_(d) {
  required_(d,['idSiswa','namaSiswa']);

  updateById_('Siswa','ID Siswa',d.idSiswa,{
    'Nama Siswa':d.namaSiswa,
    'Jenis Kelamin':d.jenisKelamin || '',
    'Tempat Lahir':d.tempatLahir || '',
    'Tanggal Lahir':d.tanggalLahir || '',
    'Jenjang':d.jenjang || '',
    'Kelas Sekolah':d.kelasSekolah || '',
    'Nama Sekolah':d.namaSekolah || '',
    'Nama Orang Tua':d.namaOrtu || '',
    'No WA':d.noWa || '',
    'Alamat':d.alamat || '',
    'Status Aktif':d.statusAktif || 'Aktif'
  });

  sinkronKelasSiswa_(d.idSiswa,d.namaSiswa,d.idKelasList || [],d.statusAktif || 'Aktif');
  return {status:true,message:'Data siswa dan pilihan kelas berhasil diperbarui.'};
}

function sinkronKelasSiswa_(idSiswa,namaSiswa,idKelasList,statusSiswa) {
  const ids = Array.isArray(idKelasList)
    ? idKelasList.map(String).filter(Boolean)
    : String(idKelasList || '').split(',').map(s=>s.trim()).filter(Boolean);

  const kelasRows = getRows_('Kelas');
  const pesertaRows = getRows_('Peserta').filter(p =>
    String(p['ID Siswa'])===String(idSiswa)
  );

  // Siswa tidak aktif tidak boleh tersisa pada Peserta Kelas.
  if (!isActive_(statusSiswa)) {
    deleteRowsWhere_('Peserta','ID Siswa',idSiswa);
    return;
  }

  // Hapus keikutsertaan kelas yang sudah dilepas agar daftar peserta
  // benar-benar hanya berisi kelas yang sedang diikuti.
  pesertaRows.forEach(p=>{
    if (!ids.includes(String(p['ID Kelas']))) {
      deleteRowsWhere_('Peserta','ID Peserta',p['ID Peserta']);
    }
  });

  // Tambahkan atau aktifkan kembali kelas yang dipilih.
  const pesertaTerbaru = getRows_('Peserta').filter(p =>
    String(p['ID Siswa'])===String(idSiswa)
  );

  ids.forEach(idKelas=>{
    const kelas = kelasRows.find(k=>String(k['ID Kelas'])===String(idKelas));
    if (!kelas) return;

    const existing = pesertaTerbaru.find(p=>String(p['ID Kelas'])===String(idKelas));
    if (existing) {
      updateById_('Peserta','ID Peserta',existing['ID Peserta'],{
        'Nama Siswa':namaSiswa,
        'Nama Kelas':kelas['Nama Kelas'],
        'Status Aktif':'Aktif',
        'Akhir Bulan':''
      });
    } else {
      appendObject_('Peserta',{
        'ID Peserta':nextId_('PST'),
        'ID Siswa':idSiswa,
        'Nama Siswa':namaSiswa,
        'ID Kelas':idKelas,
        'Nama Kelas':kelas['Nama Kelas'],
        'Tanggal Masuk':todayText_(),
        'Mulai Bulan':normalizeMonth_(todayText_().slice(0,7)),
        'Akhir Bulan':'',
        'Status Aktif':'Aktif'
      });
    }
  });
}

/**
 * Jalankan satu kali dari editor Apps Script setelah memasang versi ini.
 * Membersihkan peserta lama milik siswa tidak aktif atau siswa yang sudah terhapus.
 */
function bersihkanPesertaKelasTidakAktif() {
  ensureSetup_();
  const siswaAktifIds = new Set(
    getRows_('Siswa')
      .filter(r=>isActive_(r['Status Aktif']))
      .map(r=>String(r['ID Siswa']))
  );

  const sh = getSheet_('Peserta');
  if (sh.getLastRow()<2) {
    return {status:true,message:'Tidak ada data peserta yang perlu dibersihkan.',jumlahDihapus:0};
  }

  const headers = getHeaders_(sh);
  const colIdSiswa = headers.indexOf('ID Siswa');
  if (colIdSiswa<0) throw new Error('Kolom ID Siswa pada sheet Peserta tidak ditemukan.');

  const values = sh.getRange(2,1,sh.getLastRow()-1,headers.length).getDisplayValues();
  let dihapus = 0;
  for (let i=values.length-1;i>=0;i--) {
    const idSiswa = String(values[i][colIdSiswa] || '');
    if (!siswaAktifIds.has(idSiswa)) {
      sh.deleteRow(i+2);
      dihapus++;
    }
  }

  return {
    status:true,
    message:dihapus+' data peserta milik siswa tidak aktif/terhapus berhasil dibersihkan.',
    jumlahDihapus:dihapus
  };
}

function hapusSiswaTidakAktif_(d) {
  required_(d,['idSiswa']);
  const siswa = getRows_('Siswa').find(r=>String(r['ID Siswa'])===String(d.idSiswa));
  if (!siswa) return {status:false,message:'Siswa tidak ditemukan.'};
  if (isActive_(siswa['Status Aktif'])) {
    return {status:false,message:'Siswa masih aktif. Ubah status menjadi Tidak Aktif terlebih dahulu.'};
  }

  deleteRowsWhere_('Penilaian','ID Siswa',d.idSiswa);
  deleteRowsWhere_('Peserta','ID Siswa',d.idSiswa);
  deleteRowsWhere_('Akun','ID Siswa',d.idSiswa);
  deleteRowsWhere_('Siswa','ID Siswa',d.idSiswa);

  return {status:true,message:'Siswa tidak aktif berhasil dihapus dari daftar.'};
}

function deleteRowsWhere_(sheetName,header,value) {
  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sh);
  const col = headers.indexOf(header);
  if (col<0 || sh.getLastRow()<2) return;

  const vals = sh.getRange(2,col+1,sh.getLastRow()-1,1).getDisplayValues().flat();
  for (let i=vals.length-1;i>=0;i--) {
    if (String(vals[i])===String(value)) sh.deleteRow(i+2);
  }
}

function simpanPenilaian_(d) {
  required_(d,['idPeserta','tahun','triwulan','nilai','idPengajar']);

  const peserta = getRows_('Peserta').find(r =>
    String(r['ID Peserta'])===String(d.idPeserta)
  );
  if (!peserta) return {status:false,message:'Peserta kelas tidak ditemukan.'};

  const pengajar = getRows_('Pengajar').find(r =>
    String(r['ID Pengajar'])===String(d.idPengajar)
  ) || {};

  const triwulan = String(d.triwulan);
  const periode = String(d.tahun)+' - Triwulan '+triwulan;
  const existing = getRows_('Penilaian').find(r =>
    String(r['ID Peserta'])===String(d.idPeserta) &&
    String(r['Tahun'])===String(d.tahun) &&
    String(r['Triwulan'])===triwulan
  );

  const data = {
    'ID Peserta':peserta['ID Peserta'],
    'ID Siswa':peserta['ID Siswa'],
    'Nama Siswa':peserta['Nama Siswa'],
    'ID Kelas':peserta['ID Kelas'],
    'Nama Kelas':peserta['Nama Kelas'],
    'Tahun':String(d.tahun),
    'Triwulan':triwulan,
    'Periode':periode,
    'Nilai':num_(d.nilai),
    'Catatan':d.catatan || '',
    'ID Pengajar':d.idPengajar,
    'Nama Pengajar':pengajar['Nama Pengajar'] || d.namaPengajar || '',
    'Tanggal Input':existing ? existing['Tanggal Input'] : nowText_(),
    'Diperbarui':nowText_()
  };

  if (existing) {
    updateById_('Penilaian','ID Penilaian',existing['ID Penilaian'],data);
    return {status:true,message:'Penilaian berhasil diperbarui.',idPenilaian:existing['ID Penilaian']};
  }

  const id = nextId_('NIL');
  data['ID Penilaian'] = id;
  appendObject_('Penilaian',data);
  return {status:true,message:'Penilaian triwulan berhasil disimpan.',idPenilaian:id};
}


/* =========================================================
   MODUL V5.3 - STANDAR NOMOR WHATSAPP
   Format penyimpanan database: 08xxxxxxxxxx
   Format pembukaan WhatsApp: 628xxxxxxxxxx
========================================================= */

function normalisasiNoWa_(value) {
  let n = String(value || '').replace(/\D/g,'');
  if (!n) return '';

  // Hilangkan kode negara Indonesia dan ubah ke format nasional.
  if (n.indexOf('0062') === 0) n = n.substring(4);
  if (n.indexOf('62') === 0) n = n.substring(2);

  // Input 812... atau 81... otomatis menjadi 0812... / 081...
  n = n.replace(/^0+/, '');
  if (n.indexOf('8') === 0) n = '0' + n;

  if (!/^08\d{8,11}$/.test(n)) {
    throw new Error('Nomor WhatsApp harus berupa nomor Indonesia yang valid, misalnya 081234567890.');
  }
  return n;
}

function nomorWaInternasional_(value) {
  const nasional = normalisasiNoWa_(value);
  return nasional ? '62' + nasional.substring(1) : '';
}

// Bungkus fungsi penyimpanan agar seluruh pintu masuk memakai standar yang sama.
var addSiswaSebelumNormalisasiWa_ = addSiswa_;
addSiswa_ = function(d) {
  d = Object.assign({}, d || {});
  d.noWa = normalisasiNoWa_(d.noWa);
  return addSiswaSebelumNormalisasiWa_(d);
};

var updateSiswaSebelumNormalisasiWa_ = updateSiswa_;
updateSiswa_ = function(d) {
  d = Object.assign({}, d || {});
  if (d.noWa !== undefined && String(d.noWa).trim() !== '') {
    d.noWa = normalisasiNoWa_(d.noWa);
  }
  return updateSiswaSebelumNormalisasiWa_(d);
};

var addPengajarSebelumNormalisasiWa_ = addPengajar_;
addPengajar_ = function(d) {
  d = Object.assign({}, d || {});
  if (String(d.noWa || '').trim()) d.noWa = normalisasiNoWa_(d.noWa);
  return addPengajarSebelumNormalisasiWa_(d);
};

var updatePengajarSebelumNormalisasiWa_ = updatePengajar_;
updatePengajar_ = function(d) {
  d = Object.assign({}, d || {});
  if (String(d.noWa || '').trim()) d.noWa = normalisasiNoWa_(d.noWa);
  return updatePengajarSebelumNormalisasiWa_(d);
};

var addPendaftaranSebelumNormalisasiWa_ = addPendaftaran_;
addPendaftaran_ = function(d) {
  d = Object.assign({}, d || {});
  d.noWa = normalisasiNoWa_(d.noWa);
  return addPendaftaranSebelumNormalisasiWa_(d);
};

/**
 * Jalankan satu kali dari editor Apps Script setelah memasang V5.3.
 * Menyeragamkan nomor lama pada sheet Siswa, Pengajar, dan Pendaftaran.
 * Nomor yang tidak valid dilewati dan dilaporkan, tidak dihapus.
 */
function normalisasiSemuaNomorWhatsApp() {
  ensureSetup_();
  const targets = [
    {sheet:'Siswa', id:'ID Siswa'},
    {sheet:'Pengajar', id:'ID Pengajar'},
    {sheet:'Pendaftaran', id:'ID Pendaftaran'}
  ];

  let diperbarui = 0;
  const dilewati = [];

  targets.forEach(t => {
    const rows = getRows_(t.sheet);
    rows.forEach(r => {
      const awal = String(r['No WA'] || '').trim();
      if (!awal) return;
      try {
        const hasil = normalisasiNoWa_(awal);
        if (hasil !== awal) {
          updateById_(t.sheet,t.id,r[t.id],{'No WA':hasil});
          diperbarui++;
        }
      } catch (e) {
        dilewati.push({sheet:t.sheet,id:r[t.id],nomor:awal,alasan:e.message});
      }
    });
  });

  return {
    status:true,
    message:diperbarui+' nomor WhatsApp berhasil diseragamkan.',
    diperbarui:diperbarui,
    dilewati:dilewati
  };
}


/* =========================================================
   UPGRADE V6 - PORTAL PENGAJAR, ABSENSI, NILAI, PENGUMUMAN
========================================================= */

SCHEMA.Akun = [
  'ID Akun','ID Siswa','ID Pengajar','Nama Siswa','Username','PIN Hash','Peran',
  'Status Akun','Login Terakhir','Token Aktif','Token Kedaluwarsa'
];

const routeActionSebelumV6_ = routeAction_;
routeAction_ = function(action,p) {
  switch (action) {
    case 'portalPengajar':
      return portalPengajar_(p.token || parseData_(p.data).token);
    case 'simpanAbsensiPengajar':
      return simpanAbsensiPengajar_(parseData_(p.data),p.token || parseData_(p.data).token);
    case 'simpanPenilaianPengajar':
      return simpanPenilaianPengajar_(parseData_(p.data),p.token || parseData_(p.data).token);
    case 'buatAkunPengajar':
      validateApiKey_(p.key);
      return buatAkunPengajar_(parseData_(p.data));
    default:
      return routeActionSebelumV6_(action,p);
  }
};

function buatAkunPengajar_(d) {
  required_(d,['idPengajar']);
  const pengajar = getRows_('Pengajar').find(r =>
    String(r['ID Pengajar'])===String(d.idPengajar)
  );
  if (!pengajar) throw new Error('Data pengajar tidak ditemukan.');
  if (!isActive_(pengajar['Status Aktif'])) throw new Error('Pengajar tidak aktif.');

  const existing = getRows_('Akun').find(r =>
    String(r['ID Pengajar'])===String(d.idPengajar) &&
    String(r['Peran']).toLowerCase()==='pengajar'
  );

  const usernameBase = slugUsername_(pengajar['Nama Pengajar'] || 'pengajar');
  const username = existing ? existing['Username'] : uniqueUsername_(usernameBase);
  const pin = String(d.pin || randomPin_());
  const data = {
    'ID Siswa':'',
    'ID Pengajar':d.idPengajar,
    'Nama Siswa':pengajar['Nama Pengajar'],
    'Username':username,
    'PIN Hash':hash_(pin),
    'Peran':'Pengajar',
    'Status Akun':'Aktif',
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  };

  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],data);
    return {status:true,message:'Akun pengajar diperbarui.',idAkun:existing['ID Akun'],namaPengajar:pengajar['Nama Pengajar'],username,pin,noWa:pengajar['No WA'] || ''};
  }

  const idAkun = nextId_('AKN');
  data['ID Akun']=idAkun;
  data['Login Terakhir']='';
  appendObject_('Akun',data);
  return {status:true,message:'Akun pengajar berhasil dibuat.',idAkun,namaPengajar:pengajar['Nama Pengajar'],username,pin,noWa:pengajar['No WA'] || ''};
}

function slugUsername_(text) {
  const s = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,14);
  return s || 'pengajar';
}

function uniqueUsername_(base) {
  const used = new Set(getRows_('Akun').map(r=>String(r['Username']).toLowerCase()));
  let candidate=base, i=1;
  while (used.has(candidate.toLowerCase())) candidate=base+(++i);
  return candidate;
}

function portalPengajar_(token) {
  const akun = requireSession_(token,'Pengajar');
  const idPengajar = akun['ID Pengajar'] || akun['ID Siswa'];
  const pengajar = getRows_('Pengajar').find(r=>String(r['ID Pengajar'])===String(idPengajar));
  if (!pengajar) throw new Error('Data pengajar tidak ditemukan.');

  const kelas = getRows_('Kelas').filter(r=>
    String(r['ID Pengajar'])===String(idPengajar) && isActive_(r['Status Kelas'])
  );
  const kelasIds = kelas.map(r=>String(r['ID Kelas']));
  const peserta = getRows_('Peserta').filter(r=>
    kelasIds.includes(String(r['ID Kelas'])) && isActive_(r['Status Aktif'])
  );
  const siswaAktif = new Set(getRows_('Siswa').filter(r=>isActive_(r['Status Aktif'])).map(r=>String(r['ID Siswa'])));
  const pesertaAktif = peserta.filter(r=>siswaAktif.has(String(r['ID Siswa'])));
  const absensi = getRows_('Absensi').filter(r=>kelasIds.includes(String(r['ID Kelas'])));
  const penilaian = getRows_('Penilaian').filter(r=>kelasIds.includes(String(r['ID Kelas'])));
  const pengumuman = getRows_('Pengumuman').filter(r=>{
    if (!isActive_(r['Status'])) return false;
    const target=String(r['Target'] || '').toLowerCase();
    return target==='semua' || target==='pengajar' || kelasIds.includes(String(r['ID Kelas']));
  });

  return {
    status:true,
    user:{idPengajar,nama:pengajar['Nama Pengajar'],noWa:pengajar['No WA'] || ''},
    kelas,peserta:pesertaAktif,absensi,penilaian,pengumuman,
    summary:{
      jumlahKelas:kelas.length,
      jumlahSiswa:new Set(pesertaAktif.map(r=>String(r['ID Siswa']))).size,
      jumlahPengumuman:pengumuman.length,
      jumlahAbsensi:absensi.length
    }
  };
}

function pastikanKelasPengajar_(idPengajar,idKelas) {
  const kelas = getRows_('Kelas').find(r=>
    String(r['ID Kelas'])===String(idKelas) &&
    String(r['ID Pengajar'])===String(idPengajar) &&
    isActive_(r['Status Kelas'])
  );
  if (!kelas) throw new Error('Kelas tidak ditemukan atau bukan kelas yang Anda ampu.');
  return kelas;
}

function simpanAbsensiPengajar_(d,token) {
  const akun=requireSession_(token,'Pengajar');
  const idPengajar=akun['ID Pengajar'] || akun['ID Siswa'];
  required_(d,['idKelas','tanggal','daftar']);
  const kelas=pastikanKelasPengajar_(idPengajar,d.idKelas);
  const daftar=Array.isArray(d.daftar) ? d.daftar : [];
  if (!daftar.length) throw new Error('Daftar absensi masih kosong.');

  const pesertaValid=new Map(getRows_('Peserta').filter(r=>
    String(r['ID Kelas'])===String(d.idKelas) && isActive_(r['Status Aktif'])
  ).map(r=>[String(r['ID Siswa']),r]));

  daftar.forEach(item=>{
    const p=pesertaValid.get(String(item.idSiswa));
    if (!p) return;
    const existing=getRows_('Absensi').find(r=>
      String(r['Tanggal']).slice(0,10)===String(d.tanggal).slice(0,10) &&
      String(r['ID Kelas'])===String(d.idKelas) &&
      String(r['ID Siswa'])===String(item.idSiswa)
    );
    const row={
      'Tanggal':String(d.tanggal).slice(0,10),
      'ID Kelas':d.idKelas,
      'Nama Kelas':kelas['Nama Kelas'],
      'ID Siswa':item.idSiswa,
      'Nama Siswa':p['Nama Siswa'],
      'Kehadiran':item.kehadiran || 'Hadir',
      'Keterangan':item.keterangan || '',
      'Waktu Input':nowText_()
    };
    if (existing) updateById_('Absensi','ID Absensi',existing['ID Absensi'],row);
    else { row['ID Absensi']=nextId_('ABS'); appendObject_('Absensi',row); }
  });
  return {status:true,message:'Absensi kelas berhasil disimpan.'};
}

function simpanPenilaianPengajar_(d,token) {
  const akun=requireSession_(token,'Pengajar');
  const idPengajar=akun['ID Pengajar'] || akun['ID Siswa'];
  required_(d,['idKelas','tahun','triwulan','daftar']);
  const kelas=pastikanKelasPengajar_(idPengajar,d.idKelas);
  const pengajar=getRows_('Pengajar').find(r=>String(r['ID Pengajar'])===String(idPengajar)) || {};
  const pesertaKelas=getRows_('Peserta').filter(r=>String(r['ID Kelas'])===String(d.idKelas) && isActive_(r['Status Aktif']));
  const mapPeserta=new Map(pesertaKelas.map(r=>[String(r['ID Siswa']),r]));
  const daftar=Array.isArray(d.daftar) ? d.daftar : [];

  daftar.forEach(item=>{
    if (item.nilai==='' || item.nilai===null || item.nilai===undefined) return;
    const p=mapPeserta.get(String(item.idSiswa));
    if (!p) return;
    const nilai=Math.max(0,Math.min(100,Number(item.nilai)));
    const existing=getRows_('Penilaian').find(r=>
      String(r['ID Siswa'])===String(item.idSiswa) &&
      String(r['ID Kelas'])===String(d.idKelas) &&
      String(r['Tahun'])===String(d.tahun) &&
      String(r['Triwulan'])===String(d.triwulan)
    );
    const row={
      'ID Peserta':p['ID Peserta'],
      'ID Siswa':item.idSiswa,
      'Nama Siswa':p['Nama Siswa'],
      'ID Kelas':d.idKelas,
      'Nama Kelas':kelas['Nama Kelas'],
      'Tahun':d.tahun,
      'Triwulan':d.triwulan,
      'Periode':d.tahun+' - Triwulan '+d.triwulan,
      'Nilai':nilai,
      'Catatan':item.catatan || '',
      'ID Pengajar':idPengajar,
      'Nama Pengajar':pengajar['Nama Pengajar'] || akun['Nama Siswa'],
      'Tanggal Input':existing ? existing['Tanggal Input'] || nowText_() : nowText_(),
      'Diperbarui':nowText_()
    };
    if (existing) updateById_('Penilaian','ID Penilaian',existing['ID Penilaian'],row);
    else { row['ID Penilaian']=nextId_('NIL'); appendObject_('Penilaian',row); }
  });
  return {status:true,message:'Penilaian triwulan berhasil disimpan.'};
}


/* =========================================================
   UPGRADE V6.1 - AKUN SISWA & PENGAJAR SERAGAM / IDEMPOTEN
   =========================================================
   - Akun yang sudah ada tidak dibuat ulang dan PIN tidak diubah.
   - Username lama tetap digunakan.
   - Admin dapat melihat username yang tersimpan.
   - PIN hanya dapat diketahui setelah dibuat pertama kali atau direset.
*/

function sanitizeAkun_(rows) {
  return rows.map(function(r){
    return {
      'ID Akun':r['ID Akun'],
      'ID Siswa':r['ID Siswa'],
      'ID Pengajar':r['ID Pengajar'],
      'Nama Siswa':r['Nama Siswa'],
      'Username':r['Username'],
      'Peran':r['Peran'],
      'Status Akun':r['Status Akun'],
      'Login Terakhir':r['Login Terakhir']
    };
  });
}

function buatAkunSiswa_(d) {
  required_(d,['idSiswa']);
  var siswa = getRows_('Siswa').find(function(r){
    return String(r['ID Siswa'])===String(d.idSiswa);
  });
  if (!siswa) return {status:false,message:'Siswa tidak ditemukan.'};
  if (!isActive_(siswa['Status Aktif'])) return {status:false,message:'Siswa tidak aktif.'};

  var existing = getRows_('Akun').find(function(r){
    return String(r['ID Siswa'])===String(d.idSiswa) &&
      String(r['Peran']).toLowerCase()==='siswa';
  });

  if (existing) {
    // Sinkronkan nama/status tanpa mengubah username dan PIN.
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'Nama Siswa':siswa['Nama Siswa'],
      'Status Akun':'Aktif'
    });
    return {
      status:true,
      existingAccount:true,
      message:'Siswa sudah memiliki akun. Username lama ditampilkan dan PIN tetap berlaku.',
      idAkun:existing['ID Akun'],
      idSiswa:d.idSiswa,
      namaSiswa:siswa['Nama Siswa'],
      username:existing['Username'],
      pin:'',
      peran:'Siswa',
      noWa:siswa['No WA'] || ''
    };
  }

  var result = createStudentAccount_(d.idSiswa,siswa['Nama Siswa'],d.pin);
  return {
    status:true,
    existingAccount:false,
    message:'Akun siswa berhasil dibuat.',
    idAkun:result.idAkun,
    idSiswa:d.idSiswa,
    namaSiswa:siswa['Nama Siswa'],
    username:result.username,
    pin:result.pin,
    peran:'Siswa',
    noWa:siswa['No WA'] || ''
  };
}

function createStudentAccount_(idSiswa,namaSiswa,pinCustom) {
  var akunRows = getRows_('Akun');
  var existing = akunRows.find(function(r){
    return String(r['ID Siswa'])===String(idSiswa) &&
      String(r['Peran']).toLowerCase()==='siswa';
  });

  if (existing) {
    return {
      username:existing['Username'],
      pin:'',
      idAkun:existing['ID Akun'],
      existingAccount:true
    };
  }

  var pin = String(pinCustom || randomPin_());
  var username = makeUsername_(idSiswa,namaSiswa);
  var idAkun = nextId_('AKN');

  appendObject_('Akun',{
    'ID Akun':idAkun,
    'ID Siswa':idSiswa,
    'ID Pengajar':'',
    'Nama Siswa':namaSiswa,
    'Username':username,
    'PIN Hash':hash_(pin),
    'Peran':'Siswa',
    'Status Akun':'Aktif',
    'Login Terakhir':'',
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  });

  return {username:username,pin:pin,idAkun:idAkun,existingAccount:false};
}

function buatAkunPengajar_(d) {
  required_(d,['idPengajar']);
  var pengajar = getRows_('Pengajar').find(function(r){
    return String(r['ID Pengajar'])===String(d.idPengajar);
  });
  if (!pengajar) throw new Error('Data pengajar tidak ditemukan.');
  if (!isActive_(pengajar['Status Aktif'])) throw new Error('Pengajar tidak aktif.');

  var existing = getRows_('Akun').find(function(r){
    return String(r['ID Pengajar'])===String(d.idPengajar) &&
      String(r['Peran']).toLowerCase()==='pengajar';
  });

  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'Nama Siswa':pengajar['Nama Pengajar'],
      'Status Akun':'Aktif'
    });
    return {
      status:true,
      existingAccount:true,
      message:'Pengajar sudah memiliki akun. Username lama ditampilkan dan PIN tetap berlaku.',
      idAkun:existing['ID Akun'],
      idPengajar:d.idPengajar,
      namaPengajar:pengajar['Nama Pengajar'],
      namaSiswa:pengajar['Nama Pengajar'],
      username:existing['Username'],
      pin:'',
      peran:'Pengajar',
      noWa:pengajar['No WA'] || ''
    };
  }

  var usernameBase = slugUsername_(pengajar['Nama Pengajar'] || 'pengajar');
  var username = uniqueUsername_(usernameBase);
  var pin = String(d.pin || randomPin_());
  var idAkun = nextId_('AKN');

  appendObject_('Akun',{
    'ID Akun':idAkun,
    'ID Siswa':'',
    'ID Pengajar':d.idPengajar,
    'Nama Siswa':pengajar['Nama Pengajar'],
    'Username':username,
    'PIN Hash':hash_(pin),
    'Peran':'Pengajar',
    'Status Akun':'Aktif',
    'Login Terakhir':'',
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  });

  return {
    status:true,
    existingAccount:false,
    message:'Akun pengajar berhasil dibuat.',
    idAkun:idAkun,
    idPengajar:d.idPengajar,
    namaPengajar:pengajar['Nama Pengajar'],
    namaSiswa:pengajar['Nama Pengajar'],
    username:username,
    pin:pin,
    peran:'Pengajar',
    noWa:pengajar['No WA'] || ''
  };
}


/* =========================================================
   UPGRADE V6.2 - SATU AKUN UNTUK SETIAP SISWA/PENGAJAR
   =========================================================
   Perbaikan:
   - Pencarian akun tidak hanya berdasarkan ID, tetapi juga nama+peran
     sebagai pengaman untuk akun lama yang belum memiliki ID Pengajar.
   - Akun lama ditautkan kembali ke ID pengguna yang benar.
   - Akun ganda yang telanjur terbentuk dirapikan otomatis.
   - Membuka akun tidak pernah membuat username atau PIN baru.
*/

function normIdentity_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g,' ')
    .trim();
}

function ensureAkunHeadersV62_() {
  const sh = getSheet_('Akun');
  const required = SCHEMA.Akun;
  const current = getHeaders_(sh);
  required.forEach(function(h){
    if (current.indexOf(h) < 0) {
      sh.getRange(1,sh.getLastColumn()+1).setValue(h);
      current.push(h);
    }
  });
}

function findExistingStudentAccount_(idSiswa,namaSiswa) {
  const id = String(idSiswa || '');
  const nama = normIdentity_(namaSiswa);
  return getRows_('Akun').find(function(r){
    if (String(r['Peran']).toLowerCase() !== 'siswa') return false;
    if (id && String(r['ID Siswa']) === id) return true;
    return nama && normIdentity_(r['Nama Siswa']) === nama;
  });
}

function findExistingTeacherAccount_(idPengajar,namaPengajar) {
  const id = String(idPengajar || '');
  const nama = normIdentity_(namaPengajar);
  return getRows_('Akun').find(function(r){
    if (String(r['Peran']).toLowerCase() !== 'pengajar') return false;
    if (id && String(r['ID Pengajar']) === id) return true;
    // Kompatibilitas akun pengajar versi lama yang pernah menyimpan ID pada kolom ID Siswa.
    if (id && String(r['ID Siswa']) === id) return true;
    return nama && normIdentity_(r['Nama Siswa']) === nama;
  });
}

function pilihAkunUtama_(rows) {
  if (!rows.length) return null;
  // Pertahankan akun paling awal agar username pertama tetap berlaku.
  return rows[0];
}

function rapikanAkunGandaInternal_() {
  ensureAkunHeadersV62_();
  const akun = getRows_('Akun');
  const siswa = getRows_('Siswa');
  const pengajar = getRows_('Pengajar');
  const hapusIds = [];

  siswa.forEach(function(s){
    const id = String(s['ID Siswa'] || '');
    const nama = normIdentity_(s['Nama Siswa']);
    const cocok = akun.filter(function(a){
      return String(a['Peran']).toLowerCase()==='siswa' &&
        ((id && String(a['ID Siswa'])===id) || (nama && normIdentity_(a['Nama Siswa'])===nama));
    });
    const utama = pilihAkunUtama_(cocok);
    if (!utama) return;
    updateById_('Akun','ID Akun',utama['ID Akun'],{
      'ID Siswa':id,
      'ID Pengajar':'',
      'Nama Siswa':s['Nama Siswa'],
      'Peran':'Siswa'
    });
    cocok.slice(1).forEach(function(a){ hapusIds.push(a['ID Akun']); });
  });

  pengajar.forEach(function(p){
    const id = String(p['ID Pengajar'] || '');
    const nama = normIdentity_(p['Nama Pengajar']);
    const cocok = akun.filter(function(a){
      if (String(a['Peran']).toLowerCase()!=='pengajar') return false;
      return (id && (String(a['ID Pengajar'])===id || String(a['ID Siswa'])===id)) ||
        (nama && normIdentity_(a['Nama Siswa'])===nama);
    });
    const utama = pilihAkunUtama_(cocok);
    if (!utama) return;
    updateById_('Akun','ID Akun',utama['ID Akun'],{
      'ID Siswa':'',
      'ID Pengajar':id,
      'Nama Siswa':p['Nama Pengajar'],
      'Peran':'Pengajar'
    });
    cocok.slice(1).forEach(function(a){ hapusIds.push(a['ID Akun']); });
  });

  Array.from(new Set(hapusIds)).forEach(function(idAkun){
    deleteById_('Akun','ID Akun',idAkun,'Akun ganda');
  });
  return {status:true,jumlahDihapus:Array.from(new Set(hapusIds)).length};
}

function rapikanAkunPengguna() {
  ensureSetup_();
  const r = rapikanAkunGandaInternal_();
  return {
    status:true,
    message:r.jumlahDihapus
      ? r.jumlahDihapus+' akun ganda berhasil dibersihkan. Username akun pertama dipertahankan.'
      : 'Data akun sudah rapi. Tidak ditemukan akun ganda.',
    jumlahDihapus:r.jumlahDihapus
  };
}

// Jalankan perapian sebelum data dashboard dikirim.
const bootstrapSebelumV62_ = bootstrap_;
bootstrap_ = function() {
  rapikanAkunGandaInternal_();
  return bootstrapSebelumV62_();
};

// Override final: idempoten dan kompatibel dengan akun lama.
function buatAkunSiswa_(d) {
  required_(d,['idSiswa']);
  ensureAkunHeadersV62_();
  const siswa = getRows_('Siswa').find(function(r){
    return String(r['ID Siswa'])===String(d.idSiswa);
  });
  if (!siswa) return {status:false,message:'Siswa tidak ditemukan.'};
  if (!isActive_(siswa['Status Aktif'])) return {status:false,message:'Siswa tidak aktif.'};

  const existing = findExistingStudentAccount_(d.idSiswa,siswa['Nama Siswa']);
  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'ID Siswa':d.idSiswa,
      'ID Pengajar':'',
      'Nama Siswa':siswa['Nama Siswa'],
      'Peran':'Siswa',
      'Status Akun':'Aktif'
    });
    return {
      status:true,existingAccount:true,
      message:'Siswa sudah memiliki akun. Tidak dibuat akun baru.',
      idAkun:existing['ID Akun'],idSiswa:d.idSiswa,
      namaSiswa:siswa['Nama Siswa'],username:existing['Username'],pin:'',
      peran:'Siswa',noWa:siswa['No WA'] || ''
    };
  }

  const result = createStudentAccount_(d.idSiswa,siswa['Nama Siswa'],d.pin);
  return {
    status:true,existingAccount:false,message:'Akun siswa berhasil dibuat.',
    idAkun:result.idAkun,idSiswa:d.idSiswa,namaSiswa:siswa['Nama Siswa'],
    username:result.username,pin:result.pin,peran:'Siswa',noWa:siswa['No WA'] || ''
  };
}

function buatAkunPengajar_(d) {
  required_(d,['idPengajar']);
  ensureAkunHeadersV62_();
  const pengajar = getRows_('Pengajar').find(function(r){
    return String(r['ID Pengajar'])===String(d.idPengajar);
  });
  if (!pengajar) throw new Error('Data pengajar tidak ditemukan.');
  if (!isActive_(pengajar['Status Aktif'])) throw new Error('Pengajar tidak aktif.');

  const existing = findExistingTeacherAccount_(d.idPengajar,pengajar['Nama Pengajar']);
  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'ID Siswa':'',
      'ID Pengajar':d.idPengajar,
      'Nama Siswa':pengajar['Nama Pengajar'],
      'Peran':'Pengajar',
      'Status Akun':'Aktif'
    });
    return {
      status:true,existingAccount:true,
      message:'Pengajar sudah memiliki akun. Tidak dibuat akun baru.',
      idAkun:existing['ID Akun'],idPengajar:d.idPengajar,
      namaPengajar:pengajar['Nama Pengajar'],namaSiswa:pengajar['Nama Pengajar'],
      username:existing['Username'],pin:'',peran:'Pengajar',noWa:pengajar['No WA'] || ''
    };
  }

  const username = uniqueUsername_(slugUsername_(pengajar['Nama Pengajar'] || 'pengajar'));
  const pin = String(d.pin || randomPin_());
  const idAkun = nextId_('AKN');
  appendObject_('Akun',{
    'ID Akun':idAkun,'ID Siswa':'','ID Pengajar':d.idPengajar,
    'Nama Siswa':pengajar['Nama Pengajar'],'Username':username,
    'PIN Hash':hash_(pin),'Peran':'Pengajar','Status Akun':'Aktif',
    'Login Terakhir':'','Token Aktif':'','Token Kedaluwarsa':''
  });
  return {
    status:true,existingAccount:false,message:'Akun pengajar berhasil dibuat.',
    idAkun:idAkun,idPengajar:d.idPengajar,namaPengajar:pengajar['Nama Pengajar'],
    namaSiswa:pengajar['Nama Pengajar'],username:username,pin:pin,
    peran:'Pengajar',noWa:pengajar['No WA'] || ''
  };
}


/* =========================================================
   UPGRADE V6.3 - AKUN DAPAT DICEK ADMIN, HAPUS PENGUMUMAN,
   DAN PENILAIAN TERPADU ADMIN-PENGAJAR-SISWA
   ========================================================= */

function ensureAkunPinAksesV63_() {
  const sh=getSheet_('Akun');
  const headers=getHeaders_(sh);
  if (headers.indexOf('PIN Akses')<0) {
    sh.getRange(1,sh.getLastColumn()+1).setValue('PIN Akses');
  }
}

const bootstrapSebelumV63_ = bootstrap_;
bootstrap_ = function() {
  ensureAkunPinAksesV63_();
  return bootstrapSebelumV63_();
};

function simpanAkunPengguna_(d) {
  required_(d,['idAkun','username','pinAkses','statusAkun']);
  ensureAkunPinAksesV63_();
  const akun=getRows_('Akun').find(r=>String(r['ID Akun'])===String(d.idAkun));
  if (!akun) return {status:false,message:'Akun tidak ditemukan.'};

  const username=String(d.username||'').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return {status:false,message:'Username minimal 3 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda minus.'};
  }
  const duplicate=getRows_('Akun').find(r=>
    String(r['ID Akun'])!==String(d.idAkun) &&
    String(r['Username']).toLowerCase()===username
  );
  if (duplicate) return {status:false,message:'Username sudah digunakan akun lain.'};

  const pin=String(d.pinAkses||'').trim();
  if (!/^\d{4,8}$/.test(pin)) {
    return {status:false,message:'PIN harus terdiri dari 4 sampai 8 digit angka.'};
  }

  updateById_('Akun','ID Akun',d.idAkun,{
    'Username':username,
    'PIN Hash':hash_(pin),
    'PIN Akses':pin,
    'Status Akun':d.statusAkun,
    'Token Aktif':'',
    'Token Kedaluwarsa':''
  });
  return {
    status:true,
    message:'Akun berhasil diperbarui. Username dan PIN dapat dicek kembali oleh admin.',
    idAkun:d.idAkun,
    username:username,
    pinAkses:pin,
    pin:pin,
    peran:akun['Peran']
  };
}

// Override final pembuatan akun siswa: satu akun dan PIN dapat dicek admin.
function buatAkunSiswa_(d) {
  required_(d,['idSiswa']);
  ensureAkunHeadersV62_();
  ensureAkunPinAksesV63_();
  const siswa=getRows_('Siswa').find(r=>String(r['ID Siswa'])===String(d.idSiswa));
  if (!siswa) return {status:false,message:'Siswa tidak ditemukan.'};
  if (!isActive_(siswa['Status Aktif'])) return {status:false,message:'Siswa tidak aktif.'};

  const existing=findExistingStudentAccount_(d.idSiswa,siswa['Nama Siswa']);
  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'ID Siswa':d.idSiswa,'ID Pengajar':'','Nama Siswa':siswa['Nama Siswa'],
      'Peran':'Siswa','Status Akun':'Aktif'
    });
    return {
      status:true,existingAccount:true,
      message:'Siswa sudah memiliki akun. Tidak dibuat akun baru.',
      idAkun:existing['ID Akun'],idSiswa:d.idSiswa,namaSiswa:siswa['Nama Siswa'],
      username:existing['Username'],pin:existing['PIN Akses']||'',pinAkses:existing['PIN Akses']||'',
      peran:'Siswa',noWa:siswa['No WA']||''
    };
  }

  const username=uniqueUsername_(slugUsername_(siswa['Nama Siswa']||'siswa'));
  const pin=String(d.pin||randomPin_());
  const idAkun=nextId_('AKN');
  appendObject_('Akun',{
    'ID Akun':idAkun,'ID Siswa':d.idSiswa,'ID Pengajar':'',
    'Nama Siswa':siswa['Nama Siswa'],'Username':username,
    'PIN Hash':hash_(pin),'PIN Akses':pin,'Peran':'Siswa','Status Akun':'Aktif',
    'Login Terakhir':'','Token Aktif':'','Token Kedaluwarsa':''
  });
  return {
    status:true,existingAccount:false,message:'Akun siswa berhasil dibuat.',
    idAkun,idSiswa:d.idSiswa,namaSiswa:siswa['Nama Siswa'],username,pin,pinAkses:pin,
    peran:'Siswa',noWa:siswa['No WA']||''
  };
}

// Override final pembuatan akun pengajar: satu akun dan PIN dapat dicek admin.
function buatAkunPengajar_(d) {
  required_(d,['idPengajar']);
  ensureAkunHeadersV62_();
  ensureAkunPinAksesV63_();
  const pengajar=getRows_('Pengajar').find(r=>String(r['ID Pengajar'])===String(d.idPengajar));
  if (!pengajar) return {status:false,message:'Data pengajar tidak ditemukan.'};
  if (!isActive_(pengajar['Status Aktif'])) return {status:false,message:'Pengajar tidak aktif.'};

  const existing=findExistingTeacherAccount_(d.idPengajar,pengajar['Nama Pengajar']);
  if (existing) {
    updateById_('Akun','ID Akun',existing['ID Akun'],{
      'ID Siswa':'','ID Pengajar':d.idPengajar,'Nama Siswa':pengajar['Nama Pengajar'],
      'Peran':'Pengajar','Status Akun':'Aktif'
    });
    return {
      status:true,existingAccount:true,
      message:'Pengajar sudah memiliki akun. Tidak dibuat akun baru.',
      idAkun:existing['ID Akun'],idPengajar:d.idPengajar,
      namaPengajar:pengajar['Nama Pengajar'],namaSiswa:pengajar['Nama Pengajar'],
      username:existing['Username'],pin:existing['PIN Akses']||'',pinAkses:existing['PIN Akses']||'',
      peran:'Pengajar',noWa:pengajar['No WA']||''
    };
  }

  const username=uniqueUsername_(slugUsername_(pengajar['Nama Pengajar']||'pengajar'));
  const pin=String(d.pin||randomPin_());
  const idAkun=nextId_('AKN');
  appendObject_('Akun',{
    'ID Akun':idAkun,'ID Siswa':'','ID Pengajar':d.idPengajar,
    'Nama Siswa':pengajar['Nama Pengajar'],'Username':username,
    'PIN Hash':hash_(pin),'PIN Akses':pin,'Peran':'Pengajar','Status Akun':'Aktif',
    'Login Terakhir':'','Token Aktif':'','Token Kedaluwarsa':''
  });
  return {
    status:true,existingAccount:false,message:'Akun pengajar berhasil dibuat.',
    idAkun,idPengajar:d.idPengajar,namaPengajar:pengajar['Nama Pengajar'],
    namaSiswa:pengajar['Nama Pengajar'],username,pin,pinAkses:pin,
    peran:'Pengajar',noWa:pengajar['No WA']||''
  };
}

/* =========================================================
   UPGRADE V6.4 - PENILAIAN TUNGGAL ADMIN/PENGAJAR
   Kunci unik: ID Siswa + ID Kelas + Tahun + Triwulan
   Admin dan pengajar memperbarui baris yang sama.
========================================================= */

SCHEMA.Penilaian = [
  'ID Penilaian','ID Peserta','ID Siswa','Nama Siswa','ID Kelas','Nama Kelas',
  'Tahun','Triwulan','Periode','Nilai','Catatan','ID Pengajar','Nama Pengajar',
  'Sumber Input','Dibuat Oleh','Diperbarui Oleh','Tanggal Input','Diperbarui'
];

function kunciPenilaian_(idSiswa,idKelas,tahun,triwulan) {
  return [idSiswa,idKelas,tahun,triwulan].map(function(v){
    return String(v == null ? '' : v).trim().toLowerCase();
  }).join('|');
}

function cariPenilaianTunggal_(idSiswa,idKelas,tahun,triwulan) {
  var key = kunciPenilaian_(idSiswa,idKelas,tahun,triwulan);
  return getRows_('Penilaian').find(function(r){
    return kunciPenilaian_(r['ID Siswa'],r['ID Kelas'],r['Tahun'],r['Triwulan']) === key;
  }) || null;
}

function upsertPenilaianTunggal_(payload) {
  var existing = cariPenilaianTunggal_(payload['ID Siswa'],payload['ID Kelas'],payload['Tahun'],payload['Triwulan']);
  var now = nowText_();
  var row = Object.assign({}, payload, {
    'Periode': String(payload['Tahun']) + ' - Triwulan ' + String(payload['Triwulan']),
    'Tanggal Input': existing ? (existing['Tanggal Input'] || now) : now,
    'Diperbarui': now
  });

  if (existing) {
    row['ID Penilaian'] = existing['ID Penilaian'];
    row['Dibuat Oleh'] = existing['Dibuat Oleh'] || payload['Dibuat Oleh'] || payload['Sumber Input'] || '';
    updateById_('Penilaian','ID Penilaian',existing['ID Penilaian'],row);
    return {status:true,message:'Penilaian yang sama berhasil diperbarui.',idPenilaian:existing['ID Penilaian'],mode:'update'};
  }

  row['ID Penilaian'] = nextId_('NIL');
  row['Dibuat Oleh'] = payload['Dibuat Oleh'] || payload['Sumber Input'] || '';
  appendObject_('Penilaian',row);
  return {status:true,message:'Penilaian berhasil disimpan.',idPenilaian:row['ID Penilaian'],mode:'insert'};
}

function simpanPenilaian_(d) {
  required_(d,['idPeserta','tahun','triwulan','nilai']);
  var peserta = getRows_('Peserta').find(function(r){
    return String(r['ID Peserta']) === String(d.idPeserta);
  });
  if (!peserta) return {status:false,message:'Peserta kelas tidak ditemukan.'};

  var pengajar = {};
  if (d.idPengajar) {
    pengajar = getRows_('Pengajar').find(function(r){
      return String(r['ID Pengajar']) === String(d.idPengajar);
    }) || {};
  }

  return upsertPenilaianTunggal_({
    'ID Peserta':peserta['ID Peserta'],
    'ID Siswa':peserta['ID Siswa'],
    'Nama Siswa':peserta['Nama Siswa'],
    'ID Kelas':peserta['ID Kelas'],
    'Nama Kelas':peserta['Nama Kelas'],
    'Tahun':String(d.tahun),
    'Triwulan':String(d.triwulan),
    'Nilai':Math.max(0,Math.min(100,num_(d.nilai))),
    'Catatan':d.catatan || '',
    'ID Pengajar':d.idPengajar || pengajar['ID Pengajar'] || '',
    'Nama Pengajar':pengajar['Nama Pengajar'] || d.namaPengajar || '',
    'Sumber Input':'Admin',
    'Dibuat Oleh':'Admin',
    'Diperbarui Oleh':'Admin'
  });
}

function simpanPenilaianPengajar_(d,token) {
  var akun = requireSession_(token,'Pengajar');
  var idPengajar = akun['ID Pengajar'] || akun['ID Siswa'];
  required_(d,['idKelas','tahun','triwulan','daftar']);
  var kelas = pastikanKelasPengajar_(idPengajar,d.idKelas);
  var pengajar = getRows_('Pengajar').find(function(r){
    return String(r['ID Pengajar']) === String(idPengajar);
  }) || {};
  var pesertaKelas = getRows_('Peserta').filter(function(r){
    return String(r['ID Kelas']) === String(d.idKelas) && isActive_(r['Status Aktif']);
  });
  var mapPeserta = new Map(pesertaKelas.map(function(r){return [String(r['ID Siswa']),r];}));
  var daftar = Array.isArray(d.daftar) ? d.daftar : [];
  var tersimpan = 0;

  daftar.forEach(function(item){
    if (item.nilai === '' || item.nilai === null || item.nilai === undefined) return;
    var p = mapPeserta.get(String(item.idSiswa));
    if (!p) return;
    upsertPenilaianTunggal_({
      'ID Peserta':p['ID Peserta'],
      'ID Siswa':p['ID Siswa'],
      'Nama Siswa':p['Nama Siswa'],
      'ID Kelas':d.idKelas,
      'Nama Kelas':kelas['Nama Kelas'],
      'Tahun':String(d.tahun),
      'Triwulan':String(d.triwulan),
      'Nilai':Math.max(0,Math.min(100,Number(item.nilai))),
      'Catatan':item.catatan || '',
      'ID Pengajar':idPengajar,
      'Nama Pengajar':pengajar['Nama Pengajar'] || akun['Nama Siswa'] || '',
      'Sumber Input':'Pengajar',
      'Dibuat Oleh':'Pengajar',
      'Diperbarui Oleh':'Pengajar: ' + (pengajar['Nama Pengajar'] || akun['Nama Siswa'] || '')
    });
    tersimpan++;
  });
  return {status:true,message:tersimpan+' penilaian berhasil disimpan/diperbarui tanpa duplikasi.'};
}

function portalSiswa_(token) {
  var akun = requireSession_(token,'Siswa');
  var idSiswa = String(akun['ID Siswa'] || '').trim();
  var siswa = getRows_('Siswa').find(function(r){return String(r['ID Siswa'])===idSiswa;}) || {};
  var peserta = getRows_('Peserta').filter(function(r){
    return String(r['ID Siswa'])===idSiswa && isActive_(r['Status Aktif']);
  });
  var kelasIds = peserta.map(function(r){return String(r['ID Kelas']);});
  var pesertaIds = peserta.map(function(r){return String(r['ID Peserta']);});
  var kelas = getRows_('Kelas').filter(function(r){return kelasIds.includes(String(r['ID Kelas']));});
  var materi = getRows_('Materi').filter(function(r){
    return isActive_(r['Status Materi']) && (!r['ID Kelas'] || String(r['ID Kelas'])==='SEMUA' || kelasIds.includes(String(r['ID Kelas'])));
  }).sort(function(a,b){return num_(a['Urutan'])-num_(b['Urutan']);});
  var absensi = getRows_('Absensi').filter(function(r){return String(r['ID Siswa'])===idSiswa;});
  var pembayaran = getRows_('Pembayaran').filter(function(r){return String(r['ID Siswa'])===idSiswa;});
  var hasil = getRows_('Hasil_Latihan').filter(function(r){return String(r['ID Siswa'])===idSiswa;});

  // Mendukung data baru berdasarkan ID Siswa dan data lama berdasarkan ID Peserta.
  var penilaian = getRows_('Penilaian').filter(function(r){
    var cocokSiswa = String(r['ID Siswa'])===idSiswa;
    var cocokPeserta = pesertaIds.includes(String(r['ID Peserta']));
    var cocokKelas = !r['ID Kelas'] || kelasIds.includes(String(r['ID Kelas']));
    return (cocokSiswa || cocokPeserta) && cocokKelas;
  });

  // Pastikan hanya satu nilai per siswa-kelas-periode yang dikirim ke portal.
  var mapNilai = new Map();
  penilaian.forEach(function(r){
    var key = kunciPenilaian_(r['ID Siswa'] || idSiswa,r['ID Kelas'],r['Tahun'],r['Triwulan']);
    var lama = mapNilai.get(key);
    if (!lama || String(r['Diperbarui'] || r['Tanggal Input'] || '') >= String(lama['Diperbarui'] || lama['Tanggal Input'] || '')) mapNilai.set(key,r);
  });
  penilaian = Array.from(mapNilai.values()).sort(function(a,b){
    var ta=num_(a['Tahun']), tb=num_(b['Tahun']);
    if(ta!==tb) return tb-ta;
    return num_(b['Triwulan'])-num_(a['Triwulan']);
  });

  var pengumuman = getRows_('Pengumuman').filter(function(r){
    if (!isActive_(r['Status'])) return false;
    var target=String(r['Target']||'').toLowerCase();
    return target==='semua' || target==='siswa' || kelasIds.includes(String(r['ID Kelas']));
  });
  var totalHadir=absensi.filter(function(r){return String(r['Kehadiran']).toLowerCase()==='hadir';}).length;
  return {status:true,user:{idSiswa:idSiswa,nama:siswa['Nama Siswa']||akun['Nama Siswa'],jenjang:siswa['Jenjang']||'',namaOrtu:siswa['Nama Orang Tua']||'',noWa:siswa['No WA']||''},kelas:kelas,peserta:peserta,materi:materi,absensi:absensi,pembayaran:pembayaran,hasil:hasil,penilaian:penilaian,pengumuman:pengumuman,summary:{jumlahKelas:kelas.length,jumlahMateri:materi.length,totalAbsensi:absensi.length,totalHadir:totalHadir,tunggakan:pembayaran.reduce(function(n,r){return n+num_(r['Sisa']);},0),rataPenilaian:penilaian.length?Math.round(penilaian.reduce(function(n,r){return n+num_(r['Nilai']);},0)/penilaian.length):0,rataNilai:hasil.length?Math.round(hasil.reduce(function(n,r){return n+num_(r['Nilai']);},0)/hasil.length):0}};
}

function rapikanPenilaianGanda() {
  // Pastikan seluruh sheet pada SCHEMA tersedia.
  // Versi sebelumnya keliru memanggil ensureSheet_(), padahal helper tersebut tidak ada.
  ensureSetup_();
  var sh=getSheet_('Penilaian');
  var rows=getRows_('Penilaian');
  var groups=new Map();
  rows.forEach(function(r){
    var key=kunciPenilaian_(r['ID Siswa'],r['ID Kelas'],r['Tahun'],r['Triwulan']);
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(r);
  });
  var hapus=[];
  groups.forEach(function(items){
    if(items.length<2) return;
    items.sort(function(a,b){return String(b['Diperbarui']||b['Tanggal Input']||'').localeCompare(String(a['Diperbarui']||a['Tanggal Input']||''));});
    items.slice(1).forEach(function(r){hapus.push(String(r['ID Penilaian']));});
  });
  if(hapus.length){
    var headers=getHeaders_(sh), col=headers.indexOf('ID Penilaian');
    var vals=sh.getRange(2,col+1,sh.getLastRow()-1,1).getDisplayValues().flat();
    for(var i=vals.length-1;i>=0;i--) if(hapus.includes(String(vals[i]))) sh.deleteRow(i+2);
  }
  return {status:true,message:hapus.length+' penilaian ganda dibersihkan.',dihapus:hapus.length};
}


/* =========================================================
   UPGRADE V6.5 - RIWAYAT, EDIT, DAN HAPUS PENILAIAN
   - Admin dapat melihat/edit/hapus seluruh penilaian.
   - Pengajar hanya dapat edit/hapus penilaian pada kelas yang diampu.
========================================================= */

const routeActionSebelumV65_ = routeAction_;
routeAction_ = function(action,p) {
  switch (action) {
    case 'hapusPenilaianAdmin':
      validateApiKey_(p.key);
      return hapusPenilaianAdmin_(parseData_(p.data));
    case 'hapusPenilaianPengajar':
      return hapusPenilaianPengajar_(parseData_(p.data),p.token || parseData_(p.data).token);
    default:
      return routeActionSebelumV65_(action,p);
  }
};

function hapusPenilaianAdmin_(d) {
  required_(d,['idPenilaian']);
  var nilai = getRows_('Penilaian').find(function(r){
    return String(r['ID Penilaian']) === String(d.idPenilaian);
  });
  if (!nilai) return {status:false,message:'Data penilaian tidak ditemukan.'};

  deleteRowsWhere_('Penilaian','ID Penilaian',d.idPenilaian);
  return {
    status:true,
    message:'Penilaian '+(nilai['Nama Siswa'] || '')+' pada '+(nilai['Nama Kelas'] || '')+' berhasil dihapus.'
  };
}

function hapusPenilaianPengajar_(d,token) {
  var akun = requireSession_(token,'Pengajar');
  required_(d,['idPenilaian']);

  var idPengajar = String(akun['ID Pengajar'] || akun['ID Siswa'] || '');
  var nilai = getRows_('Penilaian').find(function(r){
    return String(r['ID Penilaian']) === String(d.idPenilaian);
  });
  if (!nilai) return {status:false,message:'Data penilaian tidak ditemukan.'};

  // Pengajar hanya boleh menghapus nilai pada kelas yang memang diampunya.
  pastikanKelasPengajar_(idPengajar,nilai['ID Kelas']);

  deleteRowsWhere_('Penilaian','ID Penilaian',d.idPenilaian);
  return {
    status:true,
    message:'Penilaian '+(nilai['Nama Siswa'] || '')+' berhasil dihapus.'
  };
}


/* =========================================================
   MODUL KELAS & JADWAL STABIL V6.6
   PENTING:
   - Sheet Kelas lama tetap menjadi program/biaya pendaftaran.
   - Jadwal operasional disimpan terpisah di Jadwal_Kelas.
   - Peserta jadwal disimpan terpisah di Peserta_Jadwal.
   - Tidak mengubah halaman pendaftaran dan harga program.
========================================================= */

function ensureSheetHeadersJadwal_(name, headers){
  var ss=getSS_();
  var sh=ss.getSheetByName(name);
  if(!sh) sh=ss.insertSheet(name);

  var existing=sh.getLastColumn()
    ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(function(x){
        return String(x||'').trim();
      })
    : [];

  if(!existing.some(Boolean)){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  }else{
    headers.forEach(function(h){
      if(existing.indexOf(h)<0){
        sh.getRange(1,sh.getLastColumn()+1).setValue(h);
        existing.push(h);
      }
    });
  }

  sh.setFrozenRows(1);
  sh.getRange(1,1,1,sh.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#1f4e79')
    .setFontColor('#ffffff');

  return sh;
}

function setupKelasJadwal(){
  ensureSetup_();

  ensureSheetHeadersJadwal_('Jadwal_Kelas',[
    'ID Jadwal','ID Kelas','Nama Program','Nama Jadwal',
    'Hari','Jam Mulai','Jam Selesai','Ruang','Kapasitas',
    'ID Pengajar','Nama Pengajar','Status Jadwal','Catatan'
  ]);

  ensureSheetHeadersJadwal_('Peserta_Jadwal',[
    'ID Peserta Jadwal','ID Jadwal','Nama Jadwal',
    'ID Siswa','Nama Siswa','Tanggal Masuk','Status Aktif'
  ]);

  return {
    status:true,
    message:'Modul Kelas & Jadwal siap digunakan tanpa mengubah program dan harga pendaftaran.'
  };
}

function normHariJadwal_(v){
  var s=String(v||'').trim().toLowerCase();
  var map={
    'senin':'Senin','monday':'Senin',
    'selasa':'Selasa','tuesday':'Selasa',
    'rabu':'Rabu','wednesday':'Rabu',
    'kamis':'Kamis','thursday':'Kamis',
    'jumat':'Jumat',"jum'at":'Jumat','friday':'Jumat',
    'sabtu':'Sabtu','saturday':'Sabtu',
    'minggu':'Minggu','sunday':'Minggu'
  };
  return map[s] || String(v||'').trim();
}

function normJamJadwal_(v){
  if(v instanceof Date){
    return Utilities.formatDate(v,CONFIG.TIMEZONE,'HH:mm');
  }
  var s=String(v||'').trim().replace('.',':');
  var m=s.match(/(\d{1,2}):(\d{2})/);
  return m
    ? ('0'+Number(m[1])).slice(-2)+':'+('0'+Number(m[2])).slice(-2)
    : s;
}

function menitJadwal_(v){
  var m=normJamJadwal_(v).match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1])*60+Number(m[2]) : null;
}

function bentrokJadwal_(aMulai,aSelesai,bMulai,bSelesai){
  var am=menitJadwal_(aMulai);
  var as=menitJadwal_(aSelesai);
  var bm=menitJadwal_(bMulai);
  var bs=menitJadwal_(bSelesai);
  if([am,as,bm,bs].some(function(x){return x===null;})) return false;
  return am<bs && bm<as;
}

function aktifJadwal_(v){
  var s=String(v||'').trim().toLowerCase();
  return s==='' || s==='aktif' || s==='active' || s==='ya';
}

function validasiJadwalOperasional_(d,idJadwal){
  required_(d,['idKelas','hari','jamMulai','jamSelesai','ruang']);

  d.hari=normHariJadwal_(d.hari);
  d.jamMulai=normJamJadwal_(d.jamMulai);
  d.jamSelesai=normJamJadwal_(d.jamSelesai);
  d.ruang=String(d.ruang||'').trim();

  var mulai=menitJadwal_(d.jamMulai);
  var selesai=menitJadwal_(d.jamSelesai);

  if(mulai===null || selesai===null || mulai>=selesai){
    throw new Error('Jam mulai dan jam selesai belum valid.');
  }

  var rows=getRows_('Jadwal_Kelas').filter(function(r){
    return String(r['ID Jadwal'])!==String(idJadwal||'') &&
      aktifJadwal_(r['Status Jadwal']);
  });

  var bentrokRuang=rows.find(function(r){
    return normHariJadwal_(r['Hari'])===d.hari &&
      String(r['Ruang']).trim()===d.ruang &&
      bentrokJadwal_(
        r['Jam Mulai'],r['Jam Selesai'],
        d.jamMulai,d.jamSelesai
      );
  });

  if(bentrokRuang){
    throw new Error(
      d.ruang+' sudah digunakan oleh '+bentrokRuang['Nama Jadwal']+
      ' pada '+normJamJadwal_(bentrokRuang['Jam Mulai'])+
      '–'+normJamJadwal_(bentrokRuang['Jam Selesai'])+'.'
    );
  }

  /*
   * Pengajar diperbolehkan mengampu lebih dari satu kelas pada waktu yang sama.
   * Kondisi operasional Sanggar Belajar Mam Is memungkinkan satu pengajar menangani
   * maksimal tiga kelas paralel di tiga ruang.
   *
   * Karena itu, bentrok pengajar tidak ditolak.
   * Validasi bentrok ruang dan bentrok jadwal siswa tetap berlaku.
   */
}

function addJadwalKelas_(d){
  setupKelasJadwal();
  validasiJadwalOperasional_(d,'');

  var program=getRows_('Kelas').find(function(r){
    return String(r['ID Kelas'])===String(d.idKelas);
  });

  if(!program) throw new Error('Program kelas tidak ditemukan.');

  var id=nextId_('JDL');
  var namaJadwal=[
    program['Nama Kelas'],
    normHariJadwal_(d.hari),
    normJamJadwal_(d.jamMulai),
    d.ruang
  ].join(' · ');

  appendObject_('Jadwal_Kelas',{
    'ID Jadwal':id,
    'ID Kelas':program['ID Kelas'],
    'Nama Program':program['Nama Kelas'],
    'Nama Jadwal':namaJadwal,
    'Hari':normHariJadwal_(d.hari),
    'Jam Mulai':normJamJadwal_(d.jamMulai),
    'Jam Selesai':normJamJadwal_(d.jamSelesai),
    'Ruang':d.ruang,
    'Kapasitas':Math.max(1,num_(d.kapasitas)||8),
    'ID Pengajar':d.idPengajar||'',
    'Nama Pengajar':d.namaPengajar||'',
    'Status Jadwal':d.statusJadwal||'Aktif',
    'Catatan':d.catatan||''
  });

  return {
    status:true,
    message:'Jadwal kelas berhasil disimpan.',
    idJadwal:id
  };
}

function updateJadwalKelas_(d){
  setupKelasJadwal();
  required_(d,['idJadwal']);
  validasiJadwalOperasional_(d,d.idJadwal);

  var program=getRows_('Kelas').find(function(r){
    return String(r['ID Kelas'])===String(d.idKelas);
  });

  if(!program) throw new Error('Program kelas tidak ditemukan.');

  var namaJadwal=[
    program['Nama Kelas'],
    normHariJadwal_(d.hari),
    normJamJadwal_(d.jamMulai),
    d.ruang
  ].join(' · ');

  updateById_('Jadwal_Kelas','ID Jadwal',d.idJadwal,{
    'ID Kelas':program['ID Kelas'],
    'Nama Program':program['Nama Kelas'],
    'Nama Jadwal':namaJadwal,
    'Hari':normHariJadwal_(d.hari),
    'Jam Mulai':normJamJadwal_(d.jamMulai),
    'Jam Selesai':normJamJadwal_(d.jamSelesai),
    'Ruang':d.ruang,
    'Kapasitas':Math.max(1,num_(d.kapasitas)||8),
    'ID Pengajar':d.idPengajar||'',
    'Nama Pengajar':d.namaPengajar||'',
    'Status Jadwal':d.statusJadwal||'Aktif',
    'Catatan':d.catatan||''
  });

  return {status:true,message:'Jadwal kelas berhasil diperbarui.'};
}

function deleteJadwalKelas_(idJadwal){
  setupKelasJadwal();

  var peserta=getRows_('Peserta_Jadwal').some(function(r){
    return String(r['ID Jadwal'])===String(idJadwal) &&
      aktifJadwal_(r['Status Aktif']);
  });

  if(peserta){
    return {
      status:false,
      message:'Jadwal masih memiliki peserta aktif. Keluarkan peserta terlebih dahulu.'
    };
  }

  deleteRowsWhere_('Jadwal_Kelas','ID Jadwal',idJadwal);
  return {status:true,message:'Jadwal kelas berhasil dihapus.'};
}

function addPesertaJadwal_(d){
  setupKelasJadwal();
  required_(d,['idJadwal','idSiswa']);

  var jadwal=getRows_('Jadwal_Kelas').find(function(r){
    return String(r['ID Jadwal'])===String(d.idJadwal);
  });

  var siswa=getRows_('Siswa').find(function(r){
    return String(r['ID Siswa'])===String(d.idSiswa);
  });

  if(!jadwal || !siswa){
    throw new Error('Data jadwal atau siswa tidak ditemukan.');
  }

  var peserta=getRows_('Peserta_Jadwal');
  var duplicate=peserta.find(function(r){
    return String(r['ID Jadwal'])===String(d.idJadwal) &&
      String(r['ID Siswa'])===String(d.idSiswa) &&
      aktifJadwal_(r['Status Aktif']);
  });

  if(duplicate){
    return {status:false,message:'Siswa sudah berada pada jadwal kelas tersebut.'};
  }

  var isi=peserta.filter(function(r){
    return String(r['ID Jadwal'])===String(d.idJadwal) &&
      aktifJadwal_(r['Status Aktif']);
  }).length;

  var kapasitas=Math.max(1,num_(jadwal['Kapasitas'])||8);
  if(isi>=kapasitas){
    throw new Error('Kelas sudah penuh ('+isi+'/'+kapasitas+').');
  }

  var jadwalAktif=getRows_('Jadwal_Kelas');
  var jadwalSiswa=peserta.filter(function(r){
    return String(r['ID Siswa'])===String(d.idSiswa) &&
      aktifJadwal_(r['Status Aktif']);
  }).map(function(p){
    return jadwalAktif.find(function(j){
      return String(j['ID Jadwal'])===String(p['ID Jadwal']);
    });
  }).filter(Boolean);

  var bentrok=jadwalSiswa.find(function(j){
    return normHariJadwal_(j['Hari'])===normHariJadwal_(jadwal['Hari']) &&
      bentrokJadwal_(
        j['Jam Mulai'],j['Jam Selesai'],
        jadwal['Jam Mulai'],jadwal['Jam Selesai']
      );
  });

  if(bentrok){
    throw new Error(
      'Siswa sudah mengikuti '+bentrok['Nama Jadwal']+
      ' pada waktu yang sama.'
    );
  }

  var id=nextId_('PJDL');
  appendObject_('Peserta_Jadwal',{
    'ID Peserta Jadwal':id,
    'ID Jadwal':jadwal['ID Jadwal'],
    'Nama Jadwal':jadwal['Nama Jadwal'],
    'ID Siswa':siswa['ID Siswa'],
    'Nama Siswa':siswa['Nama Siswa'],
    'Tanggal Masuk':d.tanggalMasuk||todayText_(),
    'Status Aktif':'Aktif'
  });

  return {
    status:true,
    message:siswa['Nama Siswa']+' berhasil ditempatkan ke jadwal kelas.'
  };
}

function removePesertaJadwal_(idPesertaJadwal){
  setupKelasJadwal();
  deleteRowsWhere_(
    'Peserta_Jadwal',
    'ID Peserta Jadwal',
    idPesertaJadwal
  );
  return {status:true,message:'Peserta berhasil dikeluarkan dari jadwal kelas.'};
}

const routeActionSebelumJadwal_ = routeAction_;
routeAction_ = function(action,p){
  switch(action){
    case 'addJadwalKelas':
      validateApiKey_(p.key);
      return addJadwalKelas_(parseData_(p.data));

    case 'updateJadwalKelas':
      validateApiKey_(p.key);
      return updateJadwalKelas_(parseData_(p.data));

    case 'deleteJadwalKelas':
      validateApiKey_(p.key);
      return deleteJadwalKelas_(p.id);

    case 'addPesertaJadwal':
      validateApiKey_(p.key);
      return addPesertaJadwal_(parseData_(p.data));

    case 'removePesertaJadwal':
      validateApiKey_(p.key);
      return removePesertaJadwal_(p.id);

    default:
      return routeActionSebelumJadwal_(action,p);
  }
};

const bootstrapSebelumJadwal_ = bootstrap_;
bootstrap_ = function(){
  setupKelasJadwal();
  var r=bootstrapSebelumJadwal_();
  r.jadwalKelas=getRows_('Jadwal_Kelas');
  r.pesertaJadwal=getRows_('Peserta_Jadwal');
  return r;
};
