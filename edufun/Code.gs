/**
 * EDUFUN — Backend mandiri untuk Sanggar Belajar Mam Is
 * Buat project Apps Script BARU, tempel file ini, isi SPREADSHEET_ID bila perlu.
 * Jalankan setupEduFun() dan setupAdminEduFun() satu kali, lalu deploy Web App.
 */
const EF_CFG={SPREADSHEET_ID:'',TIMEZONE:'Asia/Jakarta',FEE:50000,ADMIN_USER:'admin',INITIAL_PASSWORD:'GantiPasswordEduFun2026!',TOKEN_HOURS:10};
const EF_HEADERS={
PESERTA:['ID','Waktu Daftar','Nama','Kelas','WhatsApp','Email','Metode Bayar','Biaya','Status Bayar','Hadir','Waktu Hadir','URL Foto Twibbon','Nomor Sertifikat','URL Sertifikat'],
PENGATURAN:['Kunci','Nilai']
};
function efSS_(){const id=PropertiesService.getScriptProperties().getProperty('EF_SSID')||EF_CFG.SPREADSHEET_ID;return id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet()}
function setupEduFun(){const ss=efSS_();if(!ss)throw Error('Buat atau hubungkan Spreadsheet terlebih dahulu.');Object.keys(EF_HEADERS).forEach(n=>{let sh=ss.getSheetByName(n)||ss.insertSheet(n);if(!sh.getLastRow())sh.appendRow(EF_HEADERS[n]);sh.setFrozenRows(1)});PropertiesService.getScriptProperties().setProperty('EF_SSID',ss.getId());return {status:true,spreadsheet:ss.getUrl()}}
function setupAdminEduFun(){const p=PropertiesService.getScriptProperties();if(!p.getProperty('EF_ADMIN_HASH')){p.setProperty('EF_ADMIN_USER',EF_CFG.ADMIN_USER);p.setProperty('EF_ADMIN_HASH',efHash_(EF_CFG.INITIAL_PASSWORD))}return {status:true,username:p.getProperty('EF_ADMIN_USER'),initialPassword:EF_CFG.INITIAL_PASSWORD,message:'Segera ubah password awal pada Script Properties dan jalankan setupAdminEduFun kembali setelah mengganti konstanta.'}}
function doGet(e){try{const a=e.parameter.action||'ping',d=JSON.parse(e.parameter.data||'{}'),r=efRoute_(a,d);const out=JSON.stringify(r);if(e.parameter.callback)return ContentService.createTextOutput(e.parameter.callback+'('+out+')').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON)}catch(err){const r={status:false,message:err.message||String(err)};return ContentService.createTextOutput((e.parameter.callback||'')+(e.parameter.callback?'('+JSON.stringify(r)+')':JSON.stringify(r))).setMimeType(e.parameter.callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON)}}
function doPost(e){try{const d=JSON.parse(e.postData.contents||'{}');return ContentService.createTextOutput(JSON.stringify(efRoute_(d.action,d))).setMimeType(ContentService.MimeType.JSON)}catch(err){return ContentService.createTextOutput(JSON.stringify({status:false,message:String(err)})).setMimeType(ContentService.MimeType.JSON)}}
function efRoute_(a,d){switch(a){
case'ping':return {status:true,app:'EduFun'};
case'register':return efRegister_(d);
case'getPaymentInfo':return efGetPaymentInfo_();
case'adminLogin':return efLogin_(d);
case'adminList':efAuth_(d.token);return {status:true,data:efRows_()};
case'setPaid':efAuth_(d.token);return efUpdate_(d.id,{'Status Bayar':'Lunas'});
case'checkin':efAuth_(d.token);return efUpdate_(d.id,{'Hadir':'Ya','Waktu Hadir':new Date()});
case'savePhoto':efAuth_(d.token);return efSavePhoto_(d);
case'saveSettings':efAuth_(d.token);return efSaveSettings_(d);
case'issueCertificate':efAuth_(d.token);return efCertificate_(d.id);
case'verify':return efVerify_(d.id);
default:return {status:false,message:'Action tidak dikenal'};}}
function efRegister_(d){const nama=String(d.nama||'').trim(),kelas=String(d.kelas||'').trim(),wa=String(d.wa||'').trim(),email=String(d.email||'').trim(),metode=String(d.metode||'');if(!nama||!kelas||(!wa&&!email)||!['Cash','Transfer','QRIS'].includes(metode))throw Error('Data pendaftaran belum lengkap.');if(nama.length>100||kelas.length>30)throw Error('Data terlalu panjang.');const lock=LockService.getScriptLock();lock.waitLock(15000);try{const id='EF26-'+Utilities.formatString('%04d',Math.max(0,efRows_().length)+1);efSheet_('PESERTA').appendRow([id,new Date(),nama,kelas,wa,email,metode,EF_CFG.FEE,'Menunggu Konfirmasi','Tidak','','','','']);return {status:true,id:id,fee:EF_CFG.FEE}}finally{lock.releaseLock()}}
function efLogin_(d){const p=PropertiesService.getScriptProperties(),u=p.getProperty('EF_ADMIN_USER')||EF_CFG.ADMIN_USER,h=p.getProperty('EF_ADMIN_HASH')||efHash_(EF_CFG.INITIAL_PASSWORD);if(String(d.username)!==u||efHash_(String(d.password||''))!==h)throw Error('Username atau password salah.');const token=Utilities.getUuid()+Utilities.getUuid();CacheService.getScriptCache().put('EF_TOKEN_'+token,'1',EF_CFG.TOKEN_HOURS*3600);return {status:true,token}}
function efAuth_(t){if(!t||CacheService.getScriptCache().get('EF_TOKEN_'+t)!=='1')throw Error('Sesi admin tidak valid. Silakan login kembali.')}
function efHash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(x=>(x<0?x+256:x).toString(16).padStart(2,'0')).join('')}
function efSheet_(n){const s=efSS_().getSheetByName(n);if(!s)throw Error('Database belum disiapkan: '+n);return s}
function efRows_(){const sh=efSheet_('PESERTA'),v=sh.getDataRange().getValues();if(v.length<2)return [];const h=v[0];return v.slice(1).filter(r=>r[0]).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i] instanceof Date?r[i].toISOString():r[i]);return {id:o.ID,nama:o.Nama,kelas:o.Kelas,wa:o.WhatsApp,email:o.Email,metode:o['Metode Bayar'],statusBayar:o['Status Bayar'],hadir:o.Hadir,foto:o['URL Foto Twibbon'],sertifikat:o['URL Sertifikat']}})}
function efUpdate_(id,patch){const sh=efSheet_('PESERTA'),v=sh.getDataRange().getValues(),h=v[0],ix=h.indexOf('ID');for(let r=1;r<v.length;r++)if(String(v[r][ix])===String(id)){Object.keys(patch).forEach(k=>sh.getRange(r+1,h.indexOf(k)+1).setValue(patch[k]));return {status:true}}throw Error('Peserta tidak ditemukan')}
function efSavePhoto_(d){if(!d.image)throw Error('Foto kosong');const bytes=Utilities.base64Decode(d.image),blob=Utilities.newBlob(bytes,'image/png','EduFun_'+d.id+'.png'),folder=efFolder_('EduFun_Foto'),file=folder.createFile(blob);efUpdate_(d.id,{'URL Foto Twibbon':file.getUrl(),'Hadir':'Ya','Waktu Hadir':new Date()});return {status:true,url:file.getUrl()}}
function efFolder_(name){const p=PropertiesService.getScriptProperties(),id=p.getProperty('EF_FOLDER_'+name);if(id)return DriveApp.getFolderById(id);const f=DriveApp.createFolder(name);p.setProperty('EF_FOLDER_'+name,f.getId());return f}
function efSaveSettings_(d){
 const sh=efSheet_('PENGATURAN');
 const set=(key,value)=>{const v=sh.getDataRange().getValues();const i=v.findIndex((r,n)=>n>0&&r[0]===key);if(i>0)sh.getRange(i+1,2).setValue(value);else sh.appendRow([key,value]);};
 set('BANK',d.bank||'');
 if(d.qris){
  const blob=Utilities.newBlob(Utilities.base64Decode(d.qris),'image/jpeg','QRIS_EduFun.jpg');
  const file=efFolder_('EduFun_Pembayaran').createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  set('QRIS_URL','https://drive.google.com/uc?export=view&id='+file.getId());
 }
 return {status:true,message:'Pengaturan pembayaran tersimpan.'};
}
function efGetPaymentInfo_(){
 const v=efSheet_('PENGATURAN').getDataRange().getValues(),o={};
 v.slice(1).forEach(r=>o[r[0]]=r[1]);
 return {status:true,bank:o.BANK||'',qris:o.QRIS_URL||''};
}
function efCertificate_(id){const sh=efSheet_('PESERTA'),v=sh.getDataRange().getValues(),h=v[0],idx=v.findIndex((r,i)=>i>0&&String(r[0])===String(id));if(idx<1)throw Error('Peserta tidak ditemukan');const r=v[idx],get=k=>r[h.indexOf(k)];if(get('Status Bayar')!=='Lunas'||get('Hadir')!=='Ya')throw Error('Sertifikat hanya untuk peserta lunas dan hadir.');const cert='EDUFUN-2026-'+String(id).replace(/[^A-Z0-9-]/gi,'');const url=ScriptApp.getService().getUrl()+'?action=verify&data='+encodeURIComponent(JSON.stringify({id:id}));const html=`<html><head><meta charset="utf-8"><style>body{font-family:Georgia;text-align:center;border:12px double #26734d;padding:45px;color:#184c36}h1{font-size:38px;color:#26734d}h2{font-size:28px} .small{font:13px Arial}</style></head><body><h1>SERTIFIKAT</h1><h3>EDUFUN! OUTDOOR LEARNING DAY</h3><p>Diberikan kepada</p><h2>${efEsc_(get('Nama'))}</h2><p>Kelas ${efEsc_(get('Kelas'))}</p><p>Atas partisipasi dalam kegiatan EduFun! Outdoor Learning Day</p><p>Depok, 20 Desember 2026</p><p><b>Euis Gartina Ayu Sarie, S.Pd.</b><br>Pimpinan Sanggar Belajar Mam Is</p><p class="small">Nomor: ${cert}<br>Verifikasi: ${url}</p></body></html>`;const f=efFolder_('EduFun_Sertifikat').createFile(Utilities.newBlob(html,'text/html',cert+'.html'));efUpdate_(id,{'Nomor Sertifikat':cert,'URL Sertifikat':f.getUrl()});return {status:true,url:f.getUrl(),nomor:cert}}
function efVerify_(id){const x=efRows_().find(r=>r.id===id);return x?{status:true,valid:x.statusBayar==='Lunas'&&x.hadir==='Ya',nama:x.nama,kelas:x.kelas,id:x.id}:{status:false,message:'Sertifikat tidak ditemukan'}}
function efEsc_(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
