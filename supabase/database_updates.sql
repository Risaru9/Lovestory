-- 1. Add 'bio' to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- 2. Create RPC for disconnecting a couple
CREATE OR REPLACE FUNCTION disconnect_couple()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_couple_id UUID;
    v_partner_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tidak ada sesi aktif.');
    END IF;

    -- Temukan couple aktif
    SELECT id, 
           CASE WHEN user_a_id = v_user_id THEN user_b_id ELSE user_a_id END
    INTO v_couple_id, v_partner_id
    FROM couples
    WHERE (user_a_id = v_user_id OR user_b_id = v_user_id)
      AND connected_at IS NOT NULL
    LIMIT 1;

    IF v_couple_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Anda tidak sedang terhubung dengan siapapun.');
    END IF;

    -- Hapus data couple agar bersih
    DELETE FROM couples WHERE id = v_couple_id;
    
    -- Hapus relasi di profiles
    UPDATE profiles SET couple_id = NULL WHERE id = v_user_id OR id = v_partner_id;

    RETURN jsonb_build_object('success', true, 'message', 'Berhasil memutuskan hubungan dengan pasangan.');
END;
$$;
