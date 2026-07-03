-- Skrip Setup Database & Storage Supabase untuk Lovestory
-- Salin dan tempel (copy-paste) skrip ini ke dalam SQL Editor di Dashboard Supabase Anda, lalu jalankan (RUN).

-- =========================================================================
-- 1. PEMBUATAN TABEL DATABASE
-- =========================================================================

-- Tabel Photos (Menyimpan Metadata Foto)
CREATE TABLE IF NOT EXISTS public.photos (
    id TEXT PRIMARY KEY,
    caption TEXT,
    category TEXT CHECK (category IN ('date', 'travel', 'food', 'selfie', 'other')),
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Songs (Menyimpan Metadata Musik)
CREATE TABLE IF NOT EXISTS public.songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Replies (Menyimpan Balasan Surat Cinta)
CREATE TABLE IF NOT EXISTS public.replies (
    id TEXT PRIMARY KEY,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. KONFIGURASI KEBIJAKAN AKSES KEAMANAN (RLS POLICIES)
-- Agar dapat digunakan berdua tanpa sistem login yang rumit, kita buka akses publik anonim.
-- =========================================================================

-- Aktifkan RLS untuk semua tabel
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses untuk Tabel Photos
CREATE POLICY "Akses publik untuk membaca foto" ON public.photos FOR SELECT USING (true);
CREATE POLICY "Akses publik untuk menambah foto" ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Akses publik untuk memperbarui foto" ON public.photos FOR UPDATE USING (true);
CREATE POLICY "Akses publik untuk menghapus foto" ON public.photos FOR DELETE USING (true);

-- Kebijakan Akses untuk Tabel Songs
CREATE POLICY "Akses publik untuk membaca lagu" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Akses publik untuk menambah lagu" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Akses publik untuk memperbarui lagu" ON public.songs FOR UPDATE USING (true);
CREATE POLICY "Akses publik untuk menghapus lagu" ON public.songs FOR DELETE USING (true);

-- Kebijakan Akses untuk Tabel Replies
CREATE POLICY "Akses publik untuk membaca balasan" ON public.replies FOR SELECT USING (true);
CREATE POLICY "Akses publik untuk mengedit balasan" ON public.replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Akses publik untuk memperbarui balasan" ON public.replies FOR UPDATE USING (true);
CREATE POLICY "Akses publik untuk menghapus balasan" ON public.replies FOR DELETE USING (true);

-- =========================================================================
-- 3. PEMBUATAN CONTAINER STORAGE BUCKETS (FOTO & AUDIO)
-- =========================================================================

-- Daftarkan kontainer 'photos' dan 'songs' di Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('songs', 'songs', true) 
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Akses untuk File di Storage (Public Upload/Download)
CREATE POLICY "Akses publik penuh ke berkas foto" 
ON storage.objects FOR ALL 
USING (bucket_id = 'photos') 
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Akses publik penuh ke berkas lagu" 
ON storage.objects FOR ALL 
USING (bucket_id = 'songs') 
WITH CHECK (bucket_id = 'songs');
