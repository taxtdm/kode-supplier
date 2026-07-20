/**
 * ============================================================
 *  BACKEND "KODE SUPPLIER" — Google Apps Script
 * ============================================================
 *  Cara pakai:
 *  1. Buka Spreadsheet "FORM KODE SUPPLIER (Jawaban)".
 *  2. Menu Extensions > Apps Script.
 *  3. Hapus isi default, tempel seluruh isi file ini.
 *  4. Ganti SHEET_NAME di bawah sesuai nama TAB jawaban form kamu
 *     (klik tab-nya di bawah spreadsheet untuk lihat namanya persis,
 *     biasanya "Form Responses 1").
 *  5. Buat 1 folder baru di Google Drive khusus untuk menyimpan file
 *     upload (KTP/NPWP), lalu ambil ID folder dari URL-nya:
 *     https://drive.google.com/drive/folders/INI_ID_FOLDERNYA
 *     Tempel ID itu ke DRIVE_FOLDER_ID di bawah.
 *  6. Klik Deploy > New deployment > pilih tipe "Web app".
 *     - Execute as: Me
 *     - Who has access: Anyone
 *     Klik Deploy, salin URL Web App yang muncul.
 *  7. Tempel URL itu ke assets/config.js (variabel API_URL) di kedua
 *     halaman (index.html & tracking.html memakai file config.js yang sama).
 * ============================================================
 */

const SHEET_NAME = 'Form Responses 1'; // <-- SESUAIKAN dengan nama tab jawaban
const DRIVE_FOLDER_ID = 'PASTE_FOLDER_ID_DISINI'; // <-- SESUAIKAN

// Posisi kolom di sheet (1 = kolom A, 2 = kolom B, dst)
// Urutan ini mengikuti urutan pertanyaan pada Google Form kamu.
const COL = {
  TIMESTAMP: 1,          // Time
  CABANG: 2,             // Cabang (kode 3 huruf)
  NAMA_VENDOR: 3,        // Nama Vendor sesuai KTP/NPWP
  NO_KTP_NPWP: 4,        // Nomor NIK KTP / No NPWP Vendor
  NO_NPWP_PRIBADI: 5,    // Nomor NPWP Vendor Orang Pribadi (opsional)
  NAMA_BANK: 6,          // Nama Bank
  NO_REKENING: 7,        // No Rekening
  FILE_KTP_NPWP: 8,      // Upload KTP Perorangan / NPWP Badan
  FILE_NPWP_PRIBADI: 9,  // Upload NPWP Perorangan
  ATAS_NAMA: 10,         // Atas Nama (rekening)
  NO_TELP: 11,           // No Telp Vendor/PIC/Cabang
  NAMA_PIC: 12,          // Nama PIC yang mengajukan
  ALAMAT: 13,            // Alamat Lengkap
  ADMIN_NAMA: 14,        // (isi admin, auto copy dari NAMA_VENDOR)
  ADMIN_CABANG: 15,      // (isi admin, auto copy dari CABANG)
  ADMIN_NO_KTP_NPWP: 16, // (isi admin, auto copy dari NO_KTP_NPWP)
  NO_URUT: 17,           // (isi admin manual)
  KODE_FIX: 18           // KODE SUPPLIER — output akhir yang tampil di website
};

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'list') return listData();
  return jsonOut({ success: false, error: 'Aksi tidak dikenal' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ success: false, error: 'Payload tidak valid' });
  }
  if (body.action === 'submit') return submitData(body);
  if (body.action === 'process') return processData(body);
  return jsonOut({ success: false, error: 'Aksi tidak dikenal' });
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" tidak ditemukan. Cek SHEET_NAME di Code.gs.');
  return sheet;
}

// ---------- GET: daftar semua pengajuan ----------
function listData() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), COL.KODE_FIX);
  if (lastRow < 2) return jsonOut({ success: true, data: [] });

  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const data = values
    .map((row, i) => {
      const kodeFix = row[COL.KODE_FIX - 1];
      return {
        id: i + 2, // nomor baris asli di sheet, dipakai sebagai ID unik
        timestamp: row[COL.TIMESTAMP - 1],
        cabang: row[COL.CABANG - 1],
        namaVendor: row[COL.NAMA_VENDOR - 1],
        noKtpNpwp: row[COL.NO_KTP_NPWP - 1],
        noNpwpPribadi: row[COL.NO_NPWP_PRIBADI - 1],
        namaBank: row[COL.NAMA_BANK - 1],
        noRekening: row[COL.NO_REKENING - 1],
        fileKtpNpwp: row[COL.FILE_KTP_NPWP - 1],
        fileNpwpPribadi: row[COL.FILE_NPWP_PRIBADI - 1],
        atasNama: row[COL.ATAS_NAMA - 1],
        noTelp: row[COL.NO_TELP - 1],
        namaPic: row[COL.NAMA_PIC - 1],
        alamat: row[COL.ALAMAT - 1],
        noUrut: row[COL.NO_URUT - 1],
        kodeSupplier: kodeFix,
        status: kodeFix ? 'Sudah Ada Kode' : 'Menunggu Kode'
      };
    })
    .filter(r => r.namaVendor); // buang baris yang benar-benar kosong

  return jsonOut({ success: true, data: data });
}

// ---------- POST action=submit: pengajuan baru dari vendor ----------
function submitData(body) {
  const sheet = getSheet();
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  let fileKtpUrl = '';
  if (body.fileKtpNpwpName && body.fileKtpNpwpData) {
    fileKtpUrl = saveFile(folder, body.fileKtpNpwpName, body.fileKtpNpwpData, body.namaVendor + ' - KTP-NPWP');
  }
  let fileNpwpUrl = '';
  if (body.fileNpwpPribadiName && body.fileNpwpPribadiData) {
    fileNpwpUrl = saveFile(folder, body.fileNpwpPribadiName, body.fileNpwpPribadiData, body.namaVendor + ' - NPWP Pribadi');
  }

  const newRow = [];
  newRow[COL.TIMESTAMP - 1] = new Date();
  newRow[COL.CABANG - 1] = body.cabang || '';
  newRow[COL.NAMA_VENDOR - 1] = body.namaVendor || '';
  newRow[COL.NO_KTP_NPWP - 1] = body.noKtpNpwp || '';
  newRow[COL.NO_NPWP_PRIBADI - 1] = body.noNpwpPribadi || '';
  newRow[COL.NAMA_BANK - 1] = body.namaBank || '';
  newRow[COL.NO_REKENING - 1] = body.noRekening || '';
  newRow[COL.FILE_KTP_NPWP - 1] = fileKtpUrl;
  newRow[COL.FILE_NPWP_PRIBADI - 1] = fileNpwpUrl;
  newRow[COL.ATAS_NAMA - 1] = body.atasNama || '';
  newRow[COL.NO_TELP - 1] = body.noTelp || '';
  newRow[COL.NAMA_PIC - 1] = body.namaPic || '';
  newRow[COL.ALAMAT - 1] = body.alamat || '';

  sheet.appendRow(newRow);
  return jsonOut({ success: true });
}

// ---------- POST action=process: admin menetapkan Kode Supplier ----------
function processData(body) {
  const sheet = getSheet();
  const row = parseInt(body.id, 10);
  if (!row || row < 2) return jsonOut({ success: false, error: 'ID tidak valid' });

  const namaVendor = sheet.getRange(row, COL.NAMA_VENDOR).getValue();
  const cabang = sheet.getRange(row, COL.CABANG).getValue();
  const noKtpNpwp = sheet.getRange(row, COL.NO_KTP_NPWP).getValue();

  // Auto-isi kolom referensi admin (N, O, P) supaya admin tidak perlu ketik ulang
  sheet.getRange(row, COL.ADMIN_NAMA).setValue(namaVendor);
  sheet.getRange(row, COL.ADMIN_CABANG).setValue(cabang);
  sheet.getRange(row, COL.ADMIN_NO_KTP_NPWP).setValue(noKtpNpwp);

  sheet.getRange(row, COL.NO_URUT).setValue(body.noUrut || '');
  sheet.getRange(row, COL.KODE_FIX).setValue(body.kodeSupplier || '');

  return jsonOut({ success: true });
}

function saveFile(folder, fileName, base64Data, label) {
  const parts = base64Data.split(',');
  const meta = parts[0];
  const data = parts[1];
  const match = meta.match(/data:(.*);base64/);
  const contentType = match ? match[1] : 'application/octet-stream';
  const blob = Utilities.newBlob(Utilities.base64Decode(data), contentType, fileName);
  const file = folder.createFile(blob);
  file.setName(label + ' - ' + fileName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
