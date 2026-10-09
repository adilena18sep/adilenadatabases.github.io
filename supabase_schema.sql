-- Buka Supabase Dashboard > SQL Editor > New Query, lalu paste dan run kode di bawah ini:

-- 1. Tabel Inventory (Stok Barang)
CREATE TABLE public.inventory (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT, -- 'Bahan Baku', 'Kemasan', 'Bumbu', dll
    quantity NUMERIC DEFAULT 0,
    unit TEXT, -- 'gram', 'pcs', 'pack', dll
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Transactions (Keluar Masuk Barang)
CREATE TABLE public.transactions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    item_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Shopping List (Checklist Belanja)
CREATE TABLE public.shopping_list (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    item_name TEXT NOT NULL,
    estimated_price NUMERIC DEFAULT 0,
    is_bought BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan Realtime untuk semua tabel
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list;

-- Menambahkan data contoh untuk Inventory (Berdasarkan bisnis Tekwan)
INSERT INTO public.inventory (name, category, quantity, unit) VALUES
('Ikan Tenggiri Giling Grade A', 'Bahan Baku', 1000, 'gram'),
('Tepung Sagu Tani', 'Bahan Baku', 1000, 'gram'),
('Udang Segar / Ebi', 'Bahan Baku', 500, 'gram'),
('Styrofoam Persegi', 'Kemasan', 50, 'pcs'),
('Plastik PE Anti Panas', 'Kemasan', 100, 'pcs'),
('Plastik PP Bening', 'Kemasan', 100, 'pcs'),
('Stiker Logo Usaha (5cm)', 'Kemasan', 100, 'pcs');

-- Menambahkan data contoh untuk Shopping List
INSERT INTO public.shopping_list (item_name, estimated_price) VALUES
('Beli Daun Bawang & Seledri', 5000),
('Beli Jamur Kuping', 10000),
('Beli Jeruk Sonkit/Kunci', 8000);
