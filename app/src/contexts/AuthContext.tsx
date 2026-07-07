import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================
export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  couple_id: string | null;
}

export interface CoupleInfo {
  id: string;
  couple_code: string;
  user_a_id: string;
  user_b_id: string | null;
  connected_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  partner: Profile | null;
  coupleInfo: CoupleInfo | null;
  isLoading: boolean;
  isConnected: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  generateCoupleCode: () => Promise<{ code: string | null; error: string | null }>;
  connectWithCode: (code: string) => Promise<{ error: string | null }>;
  disconnectPartner: () => Promise<{ error: string | null }>;
  refreshCouple: () => Promise<void>;
  updateBio: (bio: string) => Promise<{ error: string | null }>;
  updateAvatar: (base64Str: string) => Promise<{ error: string | null }>;
  updateName: (name: string) => Promise<{ error: string | null }>;
}

// ============================================================
// CONTEXT
// ============================================================
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
};

// ============================================================
// PROVIDER
// ============================================================
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isConnected = !!(coupleInfo?.user_b_id && coupleInfo.connected_at);

  // -----------------------------------------------------------
  // Ambil profil user dari tabel profiles
  // -----------------------------------------------------------
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) { console.error('Gagal memuat profil:', error.message); return null; }
    return data as Profile;
  };

  // -----------------------------------------------------------
  // Ambil data couple dan profil pasangan
  // -----------------------------------------------------------
  const fetchCouple = async (userId: string) => {
    if (!supabase) return;

    // Ambil SEMUA couple rows di mana user terlibat (bisa lebih dari 1)
    const { data: allCouples, error } = await supabase
      .from('couples')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('connected_at', { ascending: false, nullsFirst: false });

    if (error || !allCouples || allCouples.length === 0) {
      setCoupleInfo(null);
      setPartner(null);
      return;
    }

    // Prioritaskan couple yang sudah CONNECTED (connected_at bukan null)
    const connectedCouple = allCouples.find((c: any) => c.connected_at !== null);
    const coupleData = connectedCouple || allCouples[0];

    setCoupleInfo(coupleData as CoupleInfo);

    // Ambil profil pasangan
    const partnerId = coupleData.user_a_id === userId
      ? coupleData.user_b_id
      : coupleData.user_a_id;

    if (partnerId) {
      const partnerProfile = await fetchProfile(partnerId);
      setPartner(partnerProfile);
    } else {
      setPartner(null);
    }
  };

  // -----------------------------------------------------------
  // Refresh data couple (dipanggil setelah pairing)
  // -----------------------------------------------------------
  const refreshCouple = async () => {
    if (user) await fetchCouple(user.id);
  };

  // -----------------------------------------------------------
  // Init: load session dari Supabase
  // -----------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsLoading(false);
      return;
    }

    // Load session awal
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
        await fetchCouple(s.user.id);
      }
      setIsLoading(false);
    }).catch((err) => {
      console.error("Auth session init error:", err);
      setIsLoading(false);
    });

    // Langganan perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
        await fetchCouple(s.user.id);
      } else {
        setProfile(null);
        setCoupleInfo(null);
        setPartner(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // -----------------------------------------------------------
  // Realtime subscription: Mendeteksi pairing pasangan secara instan
  // -----------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !user) return;

    const channel = supabase
      .channel(`public:couples:user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
        },
        async (payload: any) => {
          const oldVal = payload.old;
          const newVal = payload.new;

          // Cek apakah perubahan melibatkan user saat ini
          const isUserInvolved =
            newVal?.user_a_id === user.id ||
            newVal?.user_b_id === user.id ||
            oldVal?.user_a_id === user.id ||
            oldVal?.user_b_id === user.id;

          if (isUserInvolved) {
            console.log('[Realtime] Perubahan data couple terdeteksi:', payload);
            await fetchCouple(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [user]);

  // -----------------------------------------------------------
  // SIGN UP
  // -----------------------------------------------------------
  const signUp = async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase belum dikonfigurasi.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) return { error: error.message };
    if (!data.user) return { error: 'Gagal membuat akun.' };

    return { error: null };
  };

  // -----------------------------------------------------------
  // SIGN IN
  // -----------------------------------------------------------
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase belum dikonfigurasi.' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  // -----------------------------------------------------------
  // SIGN OUT
  // -----------------------------------------------------------
  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCoupleInfo(null);
    setPartner(null);
  };

  // -----------------------------------------------------------
  // GENERATE COUPLE CODE
  // -----------------------------------------------------------
  const generateCoupleCode = async (): Promise<{ code: string | null; error: string | null }> => {
    if (!supabase || !user) return { code: null, error: 'Anda harus login terlebih dahulu.' };

    // Cek apakah sudah punya couple
    const { data: existing } = await supabase
      .from('couples')
      .select('couple_code')
      .eq('user_a_id', user.id)
      .maybeSingle();

    if (existing) return { code: existing.couple_code, error: null };

    // Buat kode baru
    const adjectives = ['SWEET', 'HEART', 'LOVE', 'PINK', 'CUTE', 'DEAR', 'WARM', 'MOON', 'STAR', 'ROSE'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `${adj}-${num}`;

    const { error } = await supabase.from('couples').insert({
      user_a_id: user.id,
      couple_code: code,
    });

    if (error) return { code: null, error: `Gagal membuat kode: ${error.message}` };

    await refreshCouple();
    return { code, error: null };
  };

  // -----------------------------------------------------------
  // CONNECT WITH CODE (User B memasukkan kode dari User A)
  // -----------------------------------------------------------
  const connectWithCode = async (code: string): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: 'Anda harus login terlebih dahulu.' };

    // Panggil fungsi server-side RPC yang berjalan dengan hak akses tinggi
    const { data, error: rpcError } = await supabase.rpc('connect_couple', {
      p_code: code.toUpperCase().trim(),
    });

    if (rpcError) {
      console.error('RPC connect_couple error:', rpcError);
      return { error: `Gagal terhubung: ${rpcError.message}` };
    }

    // Fungsi RPC mengembalikan JSON { success, error?, couple_id?, message? }
    if (!data || !data.success) {
      return { error: data?.error || 'Gagal terhubung. Coba lagi.' };
    }

    // Refresh data couple setelah berhasil pairing
    await refreshCouple();
    return { error: null };
  };

  // -----------------------------------------------------------
  // DISCONNECT PARTNER
  // -----------------------------------------------------------
  const disconnectPartner = async (): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: 'Anda harus login terlebih dahulu.' };

    const { data, error: rpcError } = await supabase.rpc('disconnect_couple');

    if (rpcError) {
      console.error('RPC disconnect_couple error:', rpcError);
      return { error: `Gagal memutus hubungan: ${rpcError.message}` };
    }

    if (!data || !data.success) {
      return { error: data?.error || 'Gagal memutus hubungan.' };
    }

    await refreshCouple();
    return { error: null };
  };

  // -----------------------------------------------------------
  // PROFILE UPDATES
  // -----------------------------------------------------------
  const updateBio = async (bio: string): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: 'Belum login.' };
    const { error } = await supabase.from('profiles').update({ bio }).eq('id', user.id);
    if (!error && profile) setProfile({ ...profile, bio });
    return { error: error ? error.message : null };
  };

  const updateAvatar = async (base64Str: string): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: 'Belum login.' };
    const { error } = await supabase.from('profiles').update({ avatar_url: base64Str }).eq('id', user.id);
    if (!error && profile) setProfile({ ...profile, avatar_url: base64Str });
    return { error: error ? error.message : null };
  };

  const updateName = async (name: string): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: 'Belum login.' };
    const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
    if (!error && profile) setProfile({ ...profile, name });
    return { error: error ? error.message : null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      partner,
      coupleInfo,
      isLoading,
      isConnected,
      signUp,
      signIn,
      signOut,
      generateCoupleCode,
      connectWithCode,
      disconnectPartner,
      refreshCouple,
      updateBio,
      updateAvatar,
      updateName,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
