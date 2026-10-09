// ==========================================
// KONFIGURASI SUPABASE (WAJIB DIISI)
// ==========================================
// Dapatkan ini di Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://vkloxkxhfzbgoopowgto.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8ebyeHazhzwi8mhyTrdkqA_OJqlZqiO';

let db = null;
let isSupabaseReady = false;

// Cek apakah Supabase sudah diisi
if (SUPABASE_URL !== 'ISI_DENGAN_URL_SUPABASE_ANDA' && SUPABASE_URL.startsWith('https://')) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isSupabaseReady = true;
} else {
    document.getElementById('setup-alert').style.display = 'flex';
}

// ==========================================
// NAVIGATION (Event Delegation - Fix klik)
// ==========================================
document.getElementById('main-nav').addEventListener('click', function (e) {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;

    const tabId = btn.getAttribute('data-tab');
    if (!tabId) return;

    // Update active nav button
    this.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update active section
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Reload data for the selected tab
    if (tabId === 'stock') loadStock();
    if (tabId === 'transactions') loadTransactions();
    if (tabId === 'checklist') loadChecklist();
});

// ==========================================
// MODAL LOGIC
// ==========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'modal-transaction') {
        populateItemSelect();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Tutup modal jika klik di luar box
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// ==========================================
// UTILITY: Format Rupiah
// ==========================================
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// ==========================================
// DATA: STOCK / INVENTORY
// ==========================================
async function loadStock() {
    const tbody = document.getElementById('stock-tbody');

    if (!isSupabaseReady) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Hubungkan ke Supabase terlebih dahulu.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Memuat data...</td></tr>`;

    const { data, error } = await db
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching stock:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Gagal memuat data.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada barang di inventori.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><span class="badge category">${item.category || '-'}</span></td>
            <td><strong>${item.quantity}</strong> <span style="color:var(--text-muted); font-size:0.85rem;">${item.unit || ''}</span></td>
            <td>
                <button class="btn btn-danger" onclick="deleteStock('${item.id}')">🗑 Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// DATA: TRANSACTIONS
// ==========================================
async function loadTransactions() {
    const tbody = document.getElementById('transactions-tbody');

    if (!isSupabaseReady) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Hubungkan ke Supabase terlebih dahulu.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Memuat data...</td></tr>`;

    const { data, error } = await db
        .from('transactions')
        .select(`*, inventory ( name, unit )`)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Error fetching transactions:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Gagal memuat data.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Belum ada transaksi.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const badgeClass = t.type === 'IN' ? 'badge in' : 'badge out';
        const typeText = t.type === 'IN' ? '📥 MASUK' : '📤 KELUAR';
        const sign = t.type === 'IN' ? '+' : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color:var(--text-muted); font-size:0.88rem;">${date}</td>
            <td><strong>${t.inventory?.name || 'Barang Terhapus'}</strong></td>
            <td><span class="${badgeClass}">${typeText}</span></td>
            <td style="font-weight:700;">${sign}${t.quantity} <span style="font-size:0.82rem; font-weight:normal; color:var(--text-muted);">${t.inventory?.unit || ''}</span></td>
            <td style="color:var(--text-muted); font-size:0.88rem;">${t.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// DATA: CHECKLIST (SHOPPING LIST)
// ==========================================
async function loadChecklist() {
    const container = document.getElementById('checklist-container');

    if (!isSupabaseReady) {
        container.innerHTML = `<div class="empty-state">Hubungkan ke Supabase terlebih dahulu.</div>`;
        return;
    }

    container.innerHTML = `<div class="empty-state">Memuat data...</div>`;

    const { data, error } = await db
        .from('shopping_list')
        .select('*')
        .order('is_bought', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching checklist:', error);
        container.innerHTML = `<div class="empty-state">Gagal memuat data.</div>`;
        return;
    }

    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada daftar belanja. Klik tombol "+ Tambah Belanja" untuk menambah.</div>`;
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = `checklist-item ${item.is_bought ? 'done' : ''}`;

        div.innerHTML = `
            <div class="checklist-checkbox" onclick="toggleChecklist('${item.id}', ${!item.is_bought})"></div>
            <div class="item-name">${item.item_name}</div>
            <div class="item-price">${formatRupiah(item.estimated_price)}</div>
            <button class="item-delete" onclick="deleteChecklist('${item.id}')" title="Hapus item">✕</button>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// FORM: Tambah Stok Baru
// ==========================================
document.getElementById('form-stock').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isSupabaseReady) return alert('Hubungkan ke Supabase terlebih dahulu!');

    const name = document.getElementById('s-name').value.trim();
    const category = document.getElementById('s-category').value;
    const qty = parseFloat(document.getElementById('s-qty').value) || 0;
    const unit = document.getElementById('s-unit').value.trim();

    if (!name || !unit) return alert('Nama dan Satuan wajib diisi!');

    const { error } = await db
        .from('inventory')
        .insert([{ name, category, quantity: qty, unit }]);

    if (error) {
        alert('Gagal menambah barang: ' + error.message);
    } else {
        closeModal('modal-stock');
        e.target.reset();
        loadStock();
    }
});

// ==========================================
// FORM: Catat Transaksi & Update Stok
// ==========================================
async function populateItemSelect() {
    if (!isSupabaseReady) return;
    const select = document.getElementById('t-item');
    const { data } = await db.from('inventory').select('id, name, unit').order('name');

    select.innerHTML = '<option value="">-- Pilih Barang --</option>';
    if (data) {
        data.forEach(item => {
            select.innerHTML += `<option value="${item.id}">${item.name} (${item.unit})</option>`;
        });
    }
}

document.getElementById('form-transaction').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isSupabaseReady) return alert('Hubungkan ke Supabase terlebih dahulu!');

    const itemId = document.getElementById('t-item').value;
    const type = document.getElementById('t-type').value;
    const qty = parseFloat(document.getElementById('t-qty').value);
    const notes = document.getElementById('t-notes').value.trim();

    if (!itemId) return alert('Pilih barang terlebih dahulu!');
    if (!qty || qty <= 0) return alert('Jumlah harus lebih dari 0!');

    // 1. Dapatkan stok saat ini
    const { data: itemData } = await db
        .from('inventory')
        .select('quantity')
        .eq('id', itemId)
        .single();

    if (!itemData) return alert('Barang tidak ditemukan!');

    let newQty = parseFloat(itemData.quantity);
    if (type === 'IN') newQty += qty;
    if (type === 'OUT') newQty -= qty;

    if (newQty < 0) return alert('Stok tidak cukup! Sisa stok saat ini: ' + itemData.quantity);

    // 2. Insert transaksi
    const { error: txError } = await db
        .from('transactions')
        .insert([{ item_id: itemId, type, quantity: qty, notes: notes || null }]);

    if (txError) return alert('Gagal mencatat transaksi: ' + txError.message);

    // 3. Update stok di inventory
    const { error: updError } = await db
        .from('inventory')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', itemId);

    if (updError) return alert('Gagal mengupdate stok: ' + updError.message);

    closeModal('modal-transaction');
    e.target.reset();

    // Reload data
    loadStock();
    loadTransactions();
});

// ==========================================
// FORM: Tambah Checklist
// ==========================================
document.getElementById('form-checklist').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isSupabaseReady) return alert('Hubungkan ke Supabase terlebih dahulu!');

    const name = document.getElementById('c-name').value.trim();
    const price = parseFloat(document.getElementById('c-price').value) || 0;

    if (!name) return alert('Nama item wajib diisi!');

    const { error } = await db
        .from('shopping_list')
        .insert([{ item_name: name, estimated_price: price }]);

    if (error) {
        alert('Gagal menambah belanjaan: ' + error.message);
    } else {
        closeModal('modal-checklist');
        e.target.reset();
        loadChecklist();
    }
});

// ==========================================
// ACTIONS: Toggle & Delete
// ==========================================
async function toggleChecklist(id, isBought) {
    if (!isSupabaseReady) return;
    await db.from('shopping_list').update({ is_bought: isBought }).eq('id', id);
    loadChecklist();
}

async function deleteStock(id) {
    if (!confirm('Yakin ingin menghapus barang ini?\nSemua transaksi terkait juga akan terhapus.')) return;
    if (!isSupabaseReady) return;
    await db.from('inventory').delete().eq('id', id);
    loadStock();
}

async function deleteChecklist(id) {
    if (!confirm('Hapus item ini dari daftar belanja?')) return;
    if (!isSupabaseReady) return;
    await db.from('shopping_list').delete().eq('id', id);
    loadChecklist();
}

// ==========================================
// INITIAL LOAD
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadStock();
});
