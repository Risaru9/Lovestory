-- ============================================================
-- LOVESTORY - PERBAIKAN TOTAL COUPLE PAIRING v3
-- Jalankan di SQL Editor Supabase.
-- AMAN: Tidak menghapus tabel, hanya memperbaiki fungsi & policy.
-- ============================================================

-- ============================================================
-- 1. HAPUS FUNGSI DAN POLICY LAMA
-- ============================================================
DROP FUNCTION IF EXISTS public.connect_couple(TEXT);

DROP POLICY IF EXISTS "User dapat membaca couple mereka" ON public.couples;
DROP POLICY IF EXISTS "User dapat memperbarui couple mereka" ON public.couples;
DROP POLICY IF EXISTS "User terautentikasi dapat mencari couple code" ON public.couples;
DROP POLICY IF EXISTS "User terautentikasi dapat membaca couple" ON public.couples;
DROP POLICY IF EXISTS "Anggota couple dapat memperbarui" ON public.couples;
DROP POLICY IF EXISTS "User dapat membuat couple baru" ON public.couples;

-- ============================================================
-- 2. BUAT POLICY BARU YANG BENAR
-- ============================================================

-- Semua user terautentikasi bisa membaca tabel couples (untuk cari kode)
CREATE POLICY "couples_select_authenticated"
ON public.couples FOR SELECT
USING (auth.role() = 'authenticated');

-- User bisa membuat couple baru (saat generate kode)
CREATE POLICY "couples_insert_own"
ON public.couples FOR INSERT
WITH CHECK (auth.uid() = user_a_id);

-- Anggota couple bisa update couple mereka
CREATE POLICY "couples_update_member"
ON public.couples FOR UPDATE
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Anggota couple bisa hapus couple mereka (untuk bersihkan data orphan)
CREATE POLICY "couples_delete_own"
ON public.couples FOR DELETE
USING (auth.uid() = user_a_id AND user_b_id IS NULL AND connected_at IS NULL);

-- ============================================================
-- 3. FUNGSI RPC BARU: connect_couple (v3)
-- Menangani kasus di mana KEDUA user membuat kode masing-masing.
-- Saat User B connect dengan kode User A:
--   1. Hapus couple orphan milik User B (jika ada)
--   2. Hubungkan User B ke couple User A
--   3. Perbarui profil keduanya
-- ============================================================
CREATE OR REPLACE FUNCTION public.connect_couple(p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_couple_id UUID;
    v_user_a_id UUID;
    v_existing_b UUID;
    v_caller_id UUID;
    v_clean_code TEXT;
BEGIN
    v_caller_id := auth.uid();

    IF v_caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Anda harus login terlebih dahulu.');
    END IF;

    -- Bersihkan kode input
    v_clean_code := UPPER(TRIM(p_code));

    -- Cari couple berdasarkan kode
    SELECT id, user_a_id, user_b_id
    INTO v_couple_id, v_user_a_id, v_existing_b
    FROM public.couples
    WHERE couple_code = v_clean_code;

    -- Kode tidak ditemukan
    IF v_couple_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Kode tidak ditemukan. Periksa kembali kode yang dimasukkan.');
    END IF;

    -- Tidak bisa terhubung dengan kode sendiri
    IF v_user_a_id = v_caller_id THEN
        RETURN json_build_object('success', false, 'error', 'Anda tidak bisa terhubung dengan kode Anda sendiri.');
    END IF;

    -- Kode sudah digunakan oleh orang lain yang bukan caller
    IF v_existing_b IS NOT NULL AND v_existing_b != v_caller_id THEN
        RETURN json_build_object('success', false, 'error', 'Kode ini sudah digunakan oleh orang lain.');
    END IF;

    -- Jika caller sudah terhubung di couple ini, kembalikan sukses
    IF v_existing_b = v_caller_id THEN
        RETURN json_build_object('success', true, 'couple_id', v_couple_id, 'message', 'Anda sudah terhubung!');
    END IF;

    -- ============================================
    -- BERSIHKAN: Hapus couple orphan milik caller
    -- (couple di mana caller adalah user_a tapi belum ada pasangan)
    -- Ini terjadi ketika KEDUA user membuat kode masing-masing
    -- ============================================
    DELETE FROM public.couples
    WHERE user_a_id = v_caller_id
      AND user_b_id IS NULL
      AND connected_at IS NULL;

    -- Juga hapus couple orphan di mana caller sudah terhubung
    -- tapi dengan orang lain (seharusnya tidak terjadi, tapi untuk safety)
    -- SKIP: kita tidak mau menghapus couple yang sudah connected

    -- ============================================
    -- PROSES PAIRING
    -- ============================================

    -- 1. Hubungkan caller sebagai User B
    UPDATE public.couples
    SET user_b_id = v_caller_id,
        connected_at = NOW()
    WHERE id = v_couple_id;

    -- 2. Perbarui couple_id di profil caller (User B)
    UPDATE public.profiles
    SET couple_id = v_couple_id
    WHERE id = v_caller_id;

    -- 3. Perbarui couple_id di profil User A
    UPDATE public.profiles
    SET couple_id = v_couple_id
    WHERE id = v_user_a_id;

    RETURN json_build_object(
        'success', true,
        'couple_id', v_couple_id,
        'message', 'Berhasil terhubung!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. AKTIFKAN SUPABASE REALTIME UNTUK TABEL COUPLES
-- ============================================================
-- Konfigurasikan tabel agar mengirim semua kolom saat update
ALTER TABLE public.couples REPLICA IDENTITY FULL;

-- Masukkan tabel couples ke dalam publikasi realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'couples'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
  END IF;
END $$;
