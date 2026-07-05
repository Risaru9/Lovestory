-- ============================================================
-- LOVESTORY - DYNAMIC DATA SCHEMA (Chapters & Letters)
-- Jalankan skrip ini di SQL Editor Supabase Anda.
-- ============================================================

-- ============================================================
-- 1. BUAT TABEL CHAPTERS (Kisah Petualangan Dinamis)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapters (
    id SERIAL PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    story TEXT NOT NULL,
    achievement TEXT NOT NULL DEFAULT 'Pencapaian Baru!',
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. BUAT TABEL LETTERS (Surat Cinta Dinamis Dua Arah)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.letters (
    couple_id UUID PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
    letter_text_a TEXT DEFAULT '', -- Ditulis oleh User A
    letter_text_b TEXT DEFAULT '', -- Ditulis oleh User B
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES - CHAPTERS
-- ============================================================
DROP POLICY IF EXISTS "Anggota couple dapat membaca chapter" ON public.chapters;
DROP POLICY IF EXISTS "Anggota couple dapat menambah chapter" ON public.chapters;
DROP POLICY IF EXISTS "Anggota couple dapat memperbarui chapter" ON public.chapters;
DROP POLICY IF EXISTS "Anggota couple dapat menghapus chapter" ON public.chapters;

CREATE POLICY "Anggota couple dapat membaca chapter"
ON public.chapters FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menambah chapter"
ON public.chapters FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat memperbarui chapter"
ON public.chapters FOR UPDATE
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menghapus chapter"
ON public.chapters FOR DELETE
USING (public.is_couple_member(couple_id));

-- ============================================================
-- 5. RLS POLICIES - LETTERS
-- ============================================================
DROP POLICY IF EXISTS "Anggota couple dapat membaca letter" ON public.letters;
DROP POLICY IF EXISTS "Anggota couple dapat menambah letter" ON public.letters;
DROP POLICY IF EXISTS "Anggota couple dapat memperbarui letter" ON public.letters;

CREATE POLICY "Anggota couple dapat membaca letter"
ON public.letters FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menambah letter"
ON public.letters FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat memperbarui letter"
ON public.letters FOR UPDATE
USING (public.is_couple_member(couple_id));
