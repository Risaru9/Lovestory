-- ============================================================
-- LOVESTORY - FULL DATABASE SCHEMA v2 (dengan Autentikasi)
-- Jalankan skrip ini di SQL Editor Supabase Anda.
-- PENTING: Hapus skrip setup SQL yang lama terlebih dahulu
--          atau jalankan bagian DROP TABLE jika ada.
-- ============================================================

-- ============================================================
-- 1. HAPUS TABEL LAMA (Jika Ada)
-- ============================================================
DROP TABLE IF EXISTS public.replies CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.songs CASCADE;

-- ============================================================
-- 2. BUAT TABEL BARU
-- ============================================================

-- Tabel Profil Pengguna (Otomatis dibuat saat register)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Pengguna Baru',
    avatar_url TEXT,
    couple_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pasangan (Couple Room Privat)
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    couple_code TEXT UNIQUE NOT NULL,
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Foto (Privat per pasangan)
CREATE TABLE IF NOT EXISTS public.photos (
    id TEXT PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    category TEXT CHECK (category IN ('date', 'travel', 'food', 'selfie', 'other')) DEFAULT 'date',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Lagu (Privat per pasangan)
CREATE TABLE IF NOT EXISTS public.songs (
    id TEXT PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration TEXT NOT NULL DEFAULT '0:00',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Balasan Surat (Privat per pasangan)
CREATE TABLE IF NOT EXISTS public.replies (
    id TEXT PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES - PROFILES
-- ============================================================
CREATE POLICY "User dapat membaca profil sendiri"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.couples
    WHERE (user_a_id = auth.uid() AND user_b_id = profiles.id)
       OR (user_b_id = auth.uid() AND user_a_id = profiles.id)
));

CREATE POLICY "User dapat memperbarui profil sendiri"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "User dapat membuat profil sendiri"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================
-- 5. RLS POLICIES - COUPLES
-- ============================================================
CREATE POLICY "User dapat membaca couple mereka"
ON public.couples FOR SELECT
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "User dapat membuat couple baru"
ON public.couples FOR INSERT
WITH CHECK (auth.uid() = user_a_id);

CREATE POLICY "User dapat memperbarui couple mereka"
ON public.couples FOR UPDATE
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Policy untuk mencari couple code (saat pairing) - izinkan user terautentikasi membaca semua couple code
CREATE POLICY "User terautentikasi dapat mencari couple code"
ON public.couples FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. HELPER FUNCTION: Cek apakah user adalah anggota couple
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_couple_member(p_couple_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.couples
        WHERE id = p_couple_id
          AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. RLS POLICIES - PHOTOS (Hanya anggota couple yang bisa akses)
-- ============================================================
CREATE POLICY "Anggota couple dapat membaca foto mereka"
ON public.photos FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menambah foto"
ON public.photos FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menghapus foto mereka"
ON public.photos FOR DELETE
USING (public.is_couple_member(couple_id));

-- ============================================================
-- 8. RLS POLICIES - SONGS (Hanya anggota couple yang bisa akses)
-- ============================================================
CREATE POLICY "Anggota couple dapat membaca lagu mereka"
ON public.songs FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menambah lagu"
ON public.songs FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menghapus lagu mereka"
ON public.songs FOR DELETE
USING (public.is_couple_member(couple_id));

-- ============================================================
-- 9. RLS POLICIES - REPLIES
-- ============================================================
CREATE POLICY "Anggota couple dapat membaca surat mereka"
ON public.replies FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menambah balasan"
ON public.replies FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat memperbarui balasan"
ON public.replies FOR UPDATE
USING (public.is_couple_member(couple_id));

-- ============================================================
-- 10. STORAGE BUCKETS (Privat per folder couple)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Hanya pengguna yang login dan anggota couple bisa upload
CREATE POLICY "Anggota couple dapat upload media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Media dapat dibaca publik"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Anggota couple dapat menghapus media mereka"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 11. TRIGGER: Otomatis buat profil saat user register
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Pengguna Baru'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
