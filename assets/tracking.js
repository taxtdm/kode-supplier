// ---------- Elemen ----------
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');
const refreshBtn = document.getElementById('refreshBtn');

const modalOverlay = document.getElementById('modalOverlay');
const modalSub = document.getElementById('modalSub');
const modalNoUrut = document.getElementById('modalNoUrut');
const modalKodeSupplier = document.getElementById('modalKodeSupplier');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');
const modalMsg = document.getElementById('modalMsg');

let allRows = [];
let currentFilter = 'all';
let activeRow = null;
let isModalOpen = false;

// ---------- Load data ----------
async function loadData(silent = false) {
  if (!silent) {
    tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">Memuat data…</td></tr>`;
  }

  if (!API_URL || API_URL.includes('PASTE_URL')) {
    tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">API_URL belum dikonfigurasi (lihat assets/config.js).</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`${API_URL}?action=list`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Gagal memuat data');
    allRows = result.data;
    renderStats();
    renderTable();
  } catch (err) {
    if (!silent) {
      tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">Gagal memuat data: ${err.message}</td></tr>`;
    }
  }
}

function renderStats() {
  document.getElementById('statTotal').textContent = allRows.length;
  document.getElementById('statPending').textContent = allRows.filter(r => r.status === 'Menunggu Kode').length;
  document.getElementById('statDone').textContent = allRows.filter(r => r.status === 'Sudah Ada Kode').length;
}

function statusPillClass(status) {
  return status === 'Sudah Ada Kode' ? 'verified' : 'pending';
}

function formatDate(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function toWaLink(phoneRaw) {
  if (!phoneRaw) return null;
  let digits = String(phoneRaw).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }
  return `https://wa.me/${digits}`;
}

function renderTable() {
  const q = searchInput.value.trim().toLowerCase();

  let rows = allRows.filter(r => {
    if (currentFilter !== 'all' && r.status !== currentFilter) return false;
    if (!q) return true;
    const haystack = [r.cabang, r.namaVendor, r.namaPic, r.noKtpNpwp].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  if (rows.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="em-icon">🗂️</div>Tidak ada data yang cocok.</div></td></tr>`;
    return;
  }

  tableBody.innerHTML = rows.map(r => `
    <tr>
      <td><span class="badge-cabang">${escapeHtml(r.cabang || '-')}</span></td>
      <td class="cell-pic">
        <span class="name">${escapeHtml(r.namaVendor || '-')}</span>
        <span class="phone">${formatDate(r.timestamp)}</span>
      </td>
      <td class="cell-nc">${escapeHtml(r.noKtpNpwp || '-')}</td>
      <td class="cell-pic">
        <span class="name">${escapeHtml(r.namaPic || '-')}</span>
        ${r.noTelp ? `<a class="phone" href="${toWaLink(r.noTelp)}" target="_blank" style="color:var(--success); text-decoration:none;">💬 ${escapeHtml(r.noTelp)}</a>` : ''}
      </td>
      <td class="cell-pic">
        ${r.fileKtpNpwp ? `<a class="link-inline" href="${r.fileKtpNpwp}" target="_blank">KTP/NPWP</a>` : '<span style="color:var(--ink-soft);">–</span>'}
        ${r.fileNpwpPribadi ? `<a class="link-inline" href="${r.fileNpwpPribadi}" target="_blank">NPWP Pribadi</a>` : ''}
      </td>
      <td><span class="pill ${statusPillClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td class="cell-nc">${r.kodeSupplier ? `<strong style="color:var(--ink); font-family:'IBM Plex Mono',monospace;">${escapeHtml(r.kodeSupplier)}</strong>` : '<span style="color:var(--ink-soft);">–</span>'}</td>
      <td>${r.status === 'Menunggu Kode'
          ? `<button class="btn btn-primary btn-sm" data-id="${r.id}">Terbitkan Kode</button>`
          : `<button class="btn btn-ghost btn-sm" data-id="${r.id}">Ubah</button>`}
      </td>
    </tr>
  `).join('');

  tableBody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.id));
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---------- Filter & search ----------
filterTabs.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    filterTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTable();
  });
});
searchInput.addEventListener('input', renderTable);
refreshBtn.addEventListener('click', loadData);

// ---------- Modal terbitkan kode ----------
function suggestKode(cabang, noUrut) {
  if (!cabang || !noUrut) return '';
  const urutStr = String(noUrut).trim().padStart(3, '0');
  return `${cabang}-${urutStr}`;
}

function openModal(id) {
  activeRow = allRows.find(r => String(r.id) === String(id));
  if (!activeRow) return;
  modalSub.textContent = `Cabang ${activeRow.cabang} — ${activeRow.namaVendor}`;
  modalNoUrut.value = activeRow.noUrut || '';
  modalKodeSupplier.value = activeRow.kodeSupplier || suggestKode(activeRow.cabang, activeRow.noUrut);
  modalMsg.textContent = '';
  modalMsg.className = 'status-msg';
  modalOverlay.classList.add('open');
  isModalOpen = true;
}

function closeModal() {
  modalOverlay.classList.remove('open');
  activeRow = null;
  isModalOpen = false;
}
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// Update saran kode otomatis ketika No. Urut diubah, kecuali user sudah mengetik kode manual berbeda dari saran
modalNoUrut.addEventListener('input', () => {
  if (!activeRow) return;
  const suggestion = suggestKode(activeRow.cabang, modalNoUrut.value);
  modalKodeSupplier.value = suggestion;
});

modalSubmit.addEventListener('click', async () => {
  if (!activeRow) return;
  modalMsg.textContent = '';
  modalMsg.className = 'status-msg';

  if (!modalKodeSupplier.value.trim()) {
    modalMsg.textContent = 'Kode Supplier tidak boleh kosong.';
    modalMsg.classList.add('err');
    return;
  }

  modalSubmit.disabled = true;
  modalSubmit.textContent = 'Menyimpan…';

  try {
    const payload = {
      action: 'process',
      id: activeRow.id,
      noUrut: modalNoUrut.value.trim(),
      kodeSupplier: modalKodeSupplier.value.trim()
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Gagal menyimpan.');

    modalMsg.textContent = 'Kode Supplier berhasil disimpan.';
    modalMsg.classList.add('ok');
    await loadData();
    setTimeout(closeModal, 700);
  } catch (err) {
    modalMsg.textContent = 'Gagal: ' + err.message;
    modalMsg.classList.add('err');
  } finally {
    modalSubmit.disabled = false;
    modalSubmit.textContent = 'Simpan';
  }
});

// ---------- Init ----------
loadData();

// ---------- Auto-refresh ----------
setInterval(() => {
  if (isModalOpen) return;
  if (document.hidden) return;
  loadData(true);
}, 20000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isModalOpen) loadData(true);
});
