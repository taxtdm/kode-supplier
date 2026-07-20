// ---------- Elemen ----------
const submitForm = document.getElementById('submitForm');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('statusMsg');

const cabangSelect = document.getElementById('cabang');
const cabangCustom = document.getElementById('cabangCustom');

const fileKtpInput = document.getElementById('fileKtpNpwp');
const dzTextKtp = document.getElementById('dzTextKtp');
let fileKtp = null;

const fileNpwpInput = document.getElementById('fileNpwpPribadi');
const dzTextNpwp = document.getElementById('dzTextNpwp');
let fileNpwp = null;

// ---------- Cabang: opsi kode lain ----------
cabangSelect.addEventListener('change', () => {
  if (cabangSelect.value === '__custom') {
    cabangCustom.style.display = 'block';
    cabangCustom.required = true;
    cabangCustom.focus();
  } else {
    cabangCustom.style.display = 'none';
    cabangCustom.required = false;
    cabangCustom.value = '';
  }
});
cabangCustom.addEventListener('input', () => {
  cabangCustom.value = cabangCustom.value.toUpperCase().replace(/[^A-Z]/g, '');
});

function getCabangValue() {
  return cabangSelect.value === '__custom' ? cabangCustom.value.trim() : cabangSelect.value;
}

// ---------- Upload file ----------
fileKtpInput.addEventListener('change', () => {
  if (fileKtpInput.files.length) {
    fileKtp = fileKtpInput.files[0];
    dzTextKtp.innerHTML = `<span class="dz-file">✓ ${fileKtp.name}</span>`;
  }
});
fileNpwpInput.addEventListener('change', () => {
  if (fileNpwpInput.files.length) {
    fileNpwp = fileNpwpInput.files[0];
    dzTextNpwp.innerHTML = `<span class="dz-file">✓ ${fileNpwp.name}</span>`;
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Submit ----------
submitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusMsg.textContent = '';
  statusMsg.className = 'status-msg';

  const cabang = getCabangValue();
  if (!cabang || cabang.length !== 3) {
    statusMsg.textContent = 'Kode cabang harus 3 huruf.';
    statusMsg.classList.add('err');
    return;
  }
  if (!fileKtp) {
    statusMsg.textContent = 'Berkas KTP Perorangan / NPWP Badan wajib diunggah.';
    statusMsg.classList.add('err');
    return;
  }

  if (!API_URL || API_URL.includes('PASTE_URL')) {
    statusMsg.textContent = 'API_URL belum dikonfigurasi (lihat assets/config.js).';
    statusMsg.classList.add('err');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengirim…';

  try {
    const payload = {
      action: 'submit',
      cabang: cabang,
      namaVendor: document.getElementById('namaVendor').value.trim(),
      noKtpNpwp: document.getElementById('noKtpNpwp').value.trim(),
      noNpwpPribadi: document.getElementById('noNpwpPribadi').value.trim(),
      namaBank: document.getElementById('namaBank').value.trim(),
      noRekening: document.getElementById('noRekening').value.trim(),
      atasNama: document.getElementById('atasNama').value.trim(),
      noTelp: document.getElementById('noTelp').value.trim(),
      namaPic: document.getElementById('namaPic').value.trim(),
      alamat: document.getElementById('alamat').value.trim(),
      fileKtpNpwpName: fileKtp.name,
      fileKtpNpwpData: await fileToBase64(fileKtp)
    };
    if (fileNpwp) {
      payload.fileNpwpPribadiName = fileNpwp.name;
      payload.fileNpwpPribadiData = await fileToBase64(fileNpwp);
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Gagal mengirim pengajuan.');

    statusMsg.textContent = 'Pengajuan berhasil dikirim. Silakan cek halaman Tracking untuk melihat status.';
    statusMsg.classList.add('ok');
    submitForm.reset();
    cabangCustom.style.display = 'none';
    dzTextKtp.innerHTML = '<strong>Klik untuk pilih file</strong> atau seret ke sini';
    dzTextNpwp.innerHTML = '<strong>Klik untuk pilih file</strong> (opsional)';
    fileKtp = null;
    fileNpwp = null;
  } catch (err) {
    statusMsg.textContent = 'Gagal: ' + err.message;
    statusMsg.classList.add('err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kirim Pengajuan';
  }
});
