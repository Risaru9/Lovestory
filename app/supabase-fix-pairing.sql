-- ============================================================
-- LOVESTORY - PERBAIKAN COUPLE PAIRING (Jalankan di SQL Editor)
-- Skrip ini AMAN untuk dijalankan tanpa menghapus data yang sudah ada.
-- ============================================================

-- ============================================================
-- 1. FUNGSI RPC: connect_couple (Server-side Pairing)
-- Fungsi ini berjalan dengan hak akses tinggi (SECURITY DEFINER)
-- sehingga bisa memperbarui tabel couples & profiles tanpa
-- terhalang oleh kebijakan RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.connect_couple(p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_couple_id UUID;
    v_user_a_id UUID;
    v_existing_b UUID;
    v_caller_id UUID;
BEGIN
    -- Dapatkan ID pengguna yang memanggil fungsi ini
    v_caller_id := auth.uid();
    
    IF v_caller_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Anda harus login terlebih dahulu.');
    END IF;

    -- Cek apakah pemanggil sudah terhubung di couple lain
    IF EXISTS (
        SELECT 1 FROM public.couples
        WHERE (user_a_id = v_caller_id OR user_b_id = v_caller_id)
          AND connected_at IS NOT NULL
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Akun Anda sudah terhubung dengan pasangan lain.');
    END IF;

    -- Cari couple berdasarkan kode
    SELECT id, user_a_id, user_b_id
    INTO v_couple_id, v_user_a_id, v_existing_b
    FROM public.couples
    WHERE couple_code = UPPER(TRIM(p_code));

    -- Kode tidak ditemukan
    IF v_couple_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Kode tidak ditemukan. Periksa kembali kode yang dimasukkan.');
    END IF;

    -- Tidak bisa terhubung dengan kode sendiri
    IF v_user_a_id = v_caller_id THEN
        RETURN json_build_object('success', false, 'error', 'Anda tidak bisa terhubung dengan kode Anda sendiri.');
    END IF;

    -- Kode sudah digunakan
    IF v_existing_b IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Kode ini sudah digunakan oleh orang lain.');
    END IF;

    -- ============================================
    -- PROSES PAIRING (dengan hak akses SECURITY DEFINER)
    -- ============================================

    -- 1. Hubungkan User B ke couple
    UPDATE public.couples
    SET user_b_id = v_caller_id,
        connected_at = NOW()
    WHERE id = v_couple_id;

    -- 2. Perbarui couple_id di profil User B
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
-- 2. PERBAIKAN RLS POLICY pada tabel COUPLES
-- Agar User B bisa membaca data couple setelah terhubung
-- ============================================================

-- Hapus policy lama yang bermasalah
DROP POLICY IF EXISTS "User dapat membaca couple mereka" ON public.couples;
DROP POLICY IF EXISTS "User dapat memperbarui couple mereka" ON public.couples;
DROP POLICY IF EXISTS "User terautentikasi dapat mencari couple code" ON public.couples;

-- Buat policy baru yang lebih baik:
-- Semua user yang sudah login bisa membaca semua couple (untuk pencarian kode)
CREATE POLICY "User terautentikasi dapat membaca couple"
ON public.couples FOR SELECT
USING (auth.role() = 'authenticated');

-- Hanya anggota couple yang bisa memperbarui (atau user yang sedang connecting)
-- Note: UPDATE sekarang ditangani oleh fungsi RPC connect_couple() dengan SECURITY DEFINER
-- Tapi kita tetap perlu policy ini untuk operasi update lain oleh anggota couple
CREATE POLICY "Anggota couple dapat memperbarui"
ON public.couples FOR UPDATE
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
