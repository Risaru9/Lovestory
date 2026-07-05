-- ============================================================
-- LOVESTORY - REALTIME LOCATION & GEOFENCING SCHEMA
-- Jalankan skrip ini di SQL Editor Supabase Anda.
-- ============================================================

-- 1. TAMBAH KOLOM LOKASI PADA TABEL PROFILES (Jika belum ada)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- 2. BUAT TABEL GEOFENCES (Lokasi Penting)
CREATE TABLE IF NOT EXISTS public.geofences (
    id SERIAL PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters DOUBLE PRECISION DEFAULT 100.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BUAT TABEL LOCATION_LOGS (Log Kehadiran Tiba & Pergi)
CREATE TABLE IF NOT EXISTS public.location_logs (
    id SERIAL PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    geofence_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'arrived' | 'left'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES - GEOFENCES
DROP POLICY IF EXISTS "Anggota couple dapat membaca geofence" ON public.geofences;
DROP POLICY IF EXISTS "Anggota couple dapat membuat geofence" ON public.geofences;
DROP POLICY IF EXISTS "Anggota couple dapat menghapus geofence" ON public.geofences;

CREATE POLICY "Anggota couple dapat membaca geofence"
ON public.geofences FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat membuat geofence"
ON public.geofences FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat menghapus geofence"
ON public.geofences FOR DELETE
USING (public.is_couple_member(couple_id));

-- 6. RLS POLICIES - LOCATION_LOGS
DROP POLICY IF EXISTS "Anggota couple dapat membaca log lokasi" ON public.location_logs;
DROP POLICY IF EXISTS "Anggota couple dapat membuat log lokasi" ON public.location_logs;

CREATE POLICY "Anggota couple dapat membaca log lokasi"
ON public.location_logs FOR SELECT
USING (public.is_couple_member(couple_id));

CREATE POLICY "Anggota couple dapat membuat log lokasi"
ON public.location_logs FOR INSERT
WITH CHECK (public.is_couple_member(couple_id));

-- 7. AKTIFKAN SUPABASE REALTIME UNTUK LOKASI & LOG KEHADIRAN
ALTER TABLE public.location_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'location_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.location_logs;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
